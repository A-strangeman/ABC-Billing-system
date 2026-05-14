import React from 'react';
import { Link } from 'react-router-dom';
import './Legal.css';

export default function Privacy() {
  return (
    <div className="legal-page">
      <div className="legal-card">
        <h1>Privacy Policy</h1>
        <p>Effective date: April 14, 2026</p>

        <h2>1. Data We Collect</h2>
        <p>We collect account details such as mobile number, organization name, role, and billing activity required to operate the service.</p>

        <h2>2. How We Use Data</h2>
        <p>Data is used for authentication, billing operations, report generation, and service security.</p>

        <h2>3. Data Protection</h2>
        <p>We apply authentication controls and technical safeguards, but users must also secure their credentials.</p>

        <h2>4. Contact</h2>
        <p>For privacy requests, contact your system administrator or support channel configured for your deployment.</p>

        <div className="legal-links">
          <Link to="/terms">Terms and Conditions</Link>
          <Link to="/login">Back to Login</Link>
        </div>
      </div>
    </div>
  );
}
