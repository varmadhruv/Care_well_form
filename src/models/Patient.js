const mongoose = require("mongoose");

const patientSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    firstName: {
      type: String,
      required: true,
      trim: true,
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
    },
    age: {
      type: Number,
      required: true,
      min: 0,
      max: 120,
    },
    calculatedAge: {
      type: Number,
      required: false,
      min: 0,
      max: 120,
    },
    dateOfBirth: {
      type: String,
      required: false,
    },
    gender: {
      type: String,
      required: true,
      enum: ["Male", "Female", "Other"],
    },
    address: {
      type: String,
      required: true,
      trim: true,
    },
    phoneNumber: {
      type: String,
      required: true,
      minlength: 10,
      maxlength: 10,
    },
    alternateNumber: {
      type: String,
      required: false,
      minlength: 10,
      maxlength: 10,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    response: {
      type: String,
      required: true,
      enum: ["Positive", "Negative"],
    },
    preferredVisitDate: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

patientSchema.index({ userId: 1, firstName: 1, lastName: 1, createdAt: -1 });

const Patient = mongoose.models.Patient || mongoose.model("Patient", patientSchema, "patients");

module.exports = { Patient };
