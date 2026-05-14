import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { API } from '../utils/api';
import { normalizeMobileToTenDigits } from '../utils/mobile';
import { useAuth } from '../contexts/AuthContext';
import './Profile.css';

export default function Profile() {
  const { user, login } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const [profile, setProfile] = useState({
    firstName: '',
    lastName: '',
    organizationName: '',
    mobileNo: '',
    address: ''
  });

  const [passwordForm, setPasswordForm] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [initialProfile, setInitialProfile] = useState(null);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        setLoading(true);
        const res = await API.getProfile();
        const data = await res.json();

        if (!res.ok) throw new Error(data.error || 'Failed to load profile');

        setProfile({
          firstName: data.user.firstName || '',
          lastName: data.user.lastName || '',
          organizationName: data.user.organizationName || '',
          mobileNo: data.user.mobileNo || '',
          address: data.user.address || ''
        });
        setInitialProfile({
          firstName: data.user.firstName || '',
          lastName: data.user.lastName || '',
          organizationName: data.user.organizationName || '',
          mobileNo: data.user.mobileNo || '',
          address: data.user.address || ''
        });
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, []);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    const normalizedMobile = normalizeMobileToTenDigits(profile.mobileNo);
    if (!normalizedMobile) {
      setError('Please enter a valid mobile number (10 digits or +91 format).');
      return;
    }

    try {
      setSaving(true);
      const res = await API.updateProfile({
        firstName: profile.firstName,
        lastName: profile.lastName,
        organizationName: profile.organizationName,
        mobileNo: normalizedMobile,
        address: profile.address
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Failed to update profile');

      login(data.user);
      setProfile({
        firstName: data.user.firstName || '',
        lastName: data.user.lastName || '',
        organizationName: data.user.organizationName || '',
        mobileNo: data.user.mobileNo || '',
        address: data.user.address || ''
      });
      setInitialProfile({
        firstName: data.user.firstName || '',
        lastName: data.user.lastName || '',
        organizationName: data.user.organizationName || '',
        mobileNo: data.user.mobileNo || '',
        address: data.user.address || ''
      });
      setMessage('Profile updated successfully.');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (!passwordForm.oldPassword || !passwordForm.newPassword) {
      setError('Please fill old and new password.');
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      setError('New password must be at least 6 characters.');
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setError('New password and confirm password do not match.');
      return;
    }

    try {
      setChangingPassword(true);
      const res = await API.changePassword({
        oldPassword: passwordForm.oldPassword,
        newPassword: passwordForm.newPassword
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Failed to change password');

      setPasswordForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
      setMessage('Password changed successfully.');
    } catch (err) {
      setError(err.message);
    } finally {
      setChangingPassword(false);
    }
  };

  if (loading) {
    return <div className="profile-page min-h-screen p-8 profile-subheading">Loading profile...</div>;
  }

  const fullName = `${profile.firstName} ${profile.lastName}`.trim() || user?.username || 'User';
  const initials = `${(profile.firstName || user?.username || 'U')[0] || 'U'}${(profile.lastName || '')[0] || ''}`.toUpperCase();

  const passwordStrength = getPasswordStrength(passwordForm.newPassword);
  const hasConfirmValue = passwordForm.confirmPassword.length > 0;
  const isPasswordMatch = hasConfirmValue && passwordForm.newPassword === passwordForm.confirmPassword;
  const isPasswordMismatch = hasConfirmValue && passwordForm.newPassword !== passwordForm.confirmPassword;

  const discardChanges = () => {
    if (!initialProfile) return;
    setProfile(initialProfile);
    setMessage('Changes discarded.');
    setError('');
  };

  const cancelPasswordChange = () => {
    setPasswordForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
    setMessage('Password changes cleared.');
    setError('');
  };

  const handleDeleteAccount = async () => {
    setError('');
    setMessage('');

    const confirmed = window.confirm('Delete account permanently? This will remove your profile and billing data.');
    if (!confirmed) return;

    const finalCheck = window.prompt('Type DELETE to confirm account deletion.');
    if (finalCheck !== 'DELETE') {
      setError('Account deletion cancelled. Confirmation text did not match.');
      return;
    }

    try {
      setDeletingAccount(true);
      const res = await API.deleteAccount();
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Failed to delete account');

      localStorage.removeItem('authToken');
      window.location.href = '/login';
    } catch (err) {
      setError(err.message);
    } finally {
      setDeletingAccount(false);
    }
  };

  return (
    <div className="profile-page min-h-screen font-sans">
      <div className="profile-container mx-auto space-y-6">
        <div className="text-center py-12">
          <p className="text-lg">Profile content goes here</p>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium">{label}</span>
      {children}
    </label>
  );
}
