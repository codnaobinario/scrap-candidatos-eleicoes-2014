'use strict';

var mongoose = require('mongoose');

var Schema = mongoose.Schema;

var CandidateSchema = new Schema({
  about: { type: String },
  alliance: { type: String },
  blog: { type: String },
  created_at: { type: Date },
  elected: { type: Boolean },
  email: { type: String },
  facebook: { type: String },
  name: { type: String },
  obfuscated_slug: { type: String },
  party: { type: String },
  phone: { type: String },
  photo: { type: String },
  press_agent: { type: Boolean },
  proposals_count: { type: Number, default: 0 },
  role: { type: String },
  short_name: { type: String },
  site: { type: String },
  tse_number: { type: String },
  twitter: { type: String },
  updated_at: { type: Date }
});

module.exports = mongoose.model('Candidate', CandidateSchema);
