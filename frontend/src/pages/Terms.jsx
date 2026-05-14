import React from 'react';
import { Link } from 'react-router-dom';
import './Legal.css';

export default function Terms() {
  return (
    <div className="legal-page">
      <div className="legal-card">
        <h1>Terms and Conditions</h1>
        <p>Effective date: April 14, 2026</p>

        <h2>1. Account Usage</h2>
        <p>You are responsible for all actions performed with your account credentials and mobile OTP verification.</p>

        <h2>2. Data Accuracy</h2>
        <p>You agree to provide accurate billing, customer, and organization details while using this software.</p>

        <h2>3. Security</h2>
        <p>Do not share your OTP or password. We may suspend accounts involved in abuse or suspicious activity.</p>

        <h2>4. Service Availability</h2>
        <p>We continuously improve the platform and may change, suspend, or update features without prior notice.</p>

        <div className="legal-links">
          <Link to="/privacy">Privacy Policy</Link>
          <Link to="/login">Back to Login</Link>
        </div>
      </div>
    </div>
  );
}
