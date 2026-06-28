const express = require("express");
const { Patient } = require("../models/Patient");

const patientsRouter = express.Router();
const MAX_ID_RETRIES = 5;

function pad(n, width) {
  return String(n).padStart(width, "0");
}

function formatUserId(seq) {
  return `CW-2026-${pad(seq, 6)}`;
}

function trimString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function onlyDigits(value) {
  return String(value || "").replace(/\D/g, "");
}

function escapeRegex(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function patientProjection() {
  return {
    userId: 1,
    firstName: 1,
    lastName: 1,
    age: 1,
    calculatedAge: 1,
    dateOfBirth: 1,
    gender: 1,
    address: 1,
    phoneNumber: 1,
    alternateNumber: 1,
    email: 1,
    response: 1,
    preferredVisitDate: 1,
    createdAt: 1,
    updatedAt: 1,
  };
}

function calcAge(dob) {
  const birth = new Date(dob);
  if (Number.isNaN(birth.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const monthDiff = now.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) {
    age -= 1;
  }
  return age >= 0 ? age : null;
}

function isValidFutureDate(dateValue) {
  const visitDate = new Date(`${dateValue}T00:00:00`);
  if (Number.isNaN(visitDate.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return visitDate >= today;
}

function parseUserIdSeq(userId) {
  const match = /^CW-2026-(\d{6})$/.exec(String(userId || ""));
  return match ? Number(match[1]) : 0;
}

async function getNextUserIdFromPatients() {
  const latest = await Patient.findOne({ userId: /^CW-2026-\d{6}$/ })
    .sort({ userId: -1 })
    .select("userId")
    .lean();

  return formatUserId(parseUserIdSeq(latest?.userId) + 1);
}

patientsRouter.get("/next-id", async (req, res) => {
  try {
    res.json({
      userId: await getNextUserIdFromPatients(),
    });
  } catch (error) {
    console.error("next-id error:", error);
    res.status(500).json({ message: "Unable to generate next user id." });
  }
});

patientsRouter.get("/search", async (req, res) => {
  try {
    const query = trimString(req.query.q);
    if (!query) {
      return res.json({ patients: [] });
    }

    const regex = new RegExp(escapeRegex(query), "i");
    const patients = await Patient.find({
      $or: [
        { userId: regex },
        { firstName: regex },
        { lastName: regex },
        {
          $expr: {
            $regexMatch: {
              input: { $concat: ["$firstName", " ", "$lastName"] },
              regex: escapeRegex(query),
              options: "i",
            },
          },
        },
      ],
    })
      .select(patientProjection())
      .sort({ createdAt: -1, userId: -1 })
      .limit(30)
      .lean();

    return res.json({ patients });
  } catch (error) {
    console.error("patient search error:", error);
    return res.status(500).json({ code: "SERVER_ERROR", message: "Unable to search patients." });
  }
});

patientsRouter.get("/record/:id", async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.id).select(patientProjection()).lean();
    if (!patient) {
      return res.status(404).json({ code: "NOT_FOUND", message: "Patient record not found." });
    }
    return res.json({ patient });
  } catch (error) {
    console.error("patient detail error:", error);
    return res.status(500).json({ code: "SERVER_ERROR", message: "Unable to fetch patient details." });
  }
});

patientsRouter.post("/", async (req, res) => {
  const payload = {
    firstName: trimString(req.body.firstName),
    lastName: trimString(req.body.lastName),
    age: req.body.age !== undefined && req.body.age !== "" ? Number(req.body.age) : null,
    dateOfBirth: trimString(req.body.dateOfBirth),
    gender: trimString(req.body.gender),
    address: trimString(req.body.address),
    phoneNumber: onlyDigits(req.body.phoneNumber),
    alternateNumber: onlyDigits(req.body.alternateNumber),
    email: trimString(req.body.email).toLowerCase(),
    response: trimString(req.body.response),
    preferredVisitDate: trimString(req.body.preferredVisitDate),
  };

  try {
    if (!payload.firstName || !payload.lastName || !payload.gender || !payload.address || !payload.phoneNumber || !payload.email || !payload.response || !payload.preferredVisitDate) {
      return res.status(400).json({ code: "VALIDATION_ERROR", message: "Please complete all required fields." });
    }

    if (!/^\d{10}$/.test(payload.phoneNumber)) {
      return res.status(400).json({ code: "INVALID_PHONE", message: "Please enter a valid 10-digit phone number." });
    }

    if (payload.alternateNumber && !/^\d{10}$/.test(payload.alternateNumber)) {
      return res.status(400).json({ code: "INVALID_PHONE", message: "Please enter a valid 10-digit phone number." });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) {
      return res.status(400).json({ code: "INVALID_EMAIL", message: "Please enter a valid email address." });
    }

    if (!isValidFutureDate(payload.preferredVisitDate)) {
      return res.status(400).json({ code: "INVALID_DATE", message: "Please select a valid future date." });
    }

    let age = payload.age;
    let dateOfBirth = payload.dateOfBirth || "";

    if (age === null && dateOfBirth) {
      const calculatedAge = calcAge(dateOfBirth);
      if (calculatedAge === null) {
        return res.status(400).json({ code: "VALIDATION_ERROR", message: "Please complete all required fields." });
      }
      age = calculatedAge;
    }

    if ((age === null || Number.isNaN(age)) && !dateOfBirth) {
      return res.status(400).json({ code: "VALIDATION_ERROR", message: "Please complete all required fields." });
    }

    const baseDocument = {
      firstName: payload.firstName,
      lastName: payload.lastName,
      age,
      calculatedAge: dateOfBirth ? age : undefined,
      dateOfBirth: dateOfBirth || undefined,
      gender: payload.gender,
      address: payload.address,
      phoneNumber: payload.phoneNumber,
      alternateNumber: payload.alternateNumber || undefined,
      email: payload.email,
      response: payload.response,
      preferredVisitDate: payload.preferredVisitDate,
    };

    for (let attempt = 0; attempt < MAX_ID_RETRIES; attempt += 1) {
      const userId = await getNextUserIdFromPatients();
      try {
        const document = await Patient.create({
          userId,
          ...baseDocument,
        });

        return res.status(201).json({
          message: "Patient information has been saved successfully.",
          userId: document.userId,
        });
      } catch (error) {
        if (error && error.code === 11000 && attempt < MAX_ID_RETRIES - 1) {
          continue;
        }
        throw error;
      }
    }

    return res.status(409).json({ code: "DUPLICATE", message: "Unable to save the record. Please try again." });
  } catch (error) {
    if (error && error.code === 11000) {
      console.error("Duplicate userId generated, request will need retry:", error.message);
      return res.status(409).json({ code: "DUPLICATE", message: "Unable to save the record. Please try again." });
    }
    console.error("patient save error:", error);
    return res.status(500).json({ code: "SERVER_ERROR", message: "Unable to save the record. Please try again." });
  }
});

module.exports = { patientsRouter };
