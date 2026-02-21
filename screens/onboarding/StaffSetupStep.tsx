import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { lightColors, spacing, borderRadius, typography, elevation } from '../../utils/theme';
import { useUsers, UserRole } from '../../hooks/useUsers';
import PinKeypad from '../../components/PinKeypad';
import PinDisplay from '../../components/PinDisplay';

interface StaffSetupStepProps {
  onBack: () => void;
  onComplete: () => void;
}

interface StaffMember {
  name: string;
  email: string;
  role: UserRole;
  pin: string;
  saved: boolean;
}

const PIN_LENGTH = 6;

const ROLE_INFO: Record<UserRole, { label: string; description: string; icon: string }> = {
  admin: { label: 'Admin', description: 'Full access to all settings and reports', icon: '👑' },
  manager: { label: 'Manager', description: 'Manage products, view reports, process refunds', icon: '📊' },
  cashier: { label: 'Cashier', description: 'Process sales and handle basic operations', icon: '💳' },
};

const StaffSetupStep: React.FC<StaffSetupStepProps> = ({ onBack, onComplete }) => {
  const { createUser, isPinUnique } = useUsers();

  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [currentName, setCurrentName] = useState('');
  const [currentEmail, setCurrentEmail] = useState('');
  const [currentRole, setCurrentRole] = useState<UserRole>('cashier');
  const [currentPin, setCurrentPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pinStep, setPinStep] = useState<'info' | 'pin' | 'confirm'>('info');
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const resetForm = () => {
    setCurrentName('');
    setCurrentEmail('');
    setCurrentRole('cashier');
    setCurrentPin('');
    setConfirmPin('');
    setPinStep('info');
    setError(null);
    setIsAdding(false);
  };

  const handleKeyPress = (key: string) => {
    if (key === 'biometric') return;

    if (pinStep === 'pin') {
      if (currentPin.length < PIN_LENGTH) {
        const newPin = currentPin + key;
        setCurrentPin(newPin);
        if (newPin.length === PIN_LENGTH) {
          setTimeout(() => setPinStep('confirm'), 300);
        }
      }
    } else if (pinStep === 'confirm') {
      if (confirmPin.length < PIN_LENGTH) {
        const newConfirm = confirmPin + key;
        setConfirmPin(newConfirm);
        if (newConfirm.length === PIN_LENGTH) {
          setTimeout(() => saveStaffMember(newConfirm), 300);
        }
      }
    }
  };

  const handleDelete = () => {
    if (pinStep === 'pin') {
      setCurrentPin(currentPin.slice(0, -1));
    } else if (pinStep === 'confirm') {
      setConfirmPin(confirmPin.slice(0, -1));
    }
  };

  const handleContinueToPin = () => {
    if (!currentName.trim()) {
      Alert.alert('Validation', 'Please enter a name.');
      return;
    }
    if (currentEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(currentEmail)) {
      Alert.alert('Validation', 'Please enter a valid email address.');
      return;
    }
    setPinStep('pin');
  };

  const saveStaffMember = async (confirmedPin: string) => {
    setError(null);

    if (currentPin !== confirmedPin) {
      setError('PINs do not match. Please try again.');
      setCurrentPin('');
      setConfirmPin('');
      setPinStep('pin');
      return;
    }

    setIsSaving(true);
    try {
      const isUnique = await isPinUnique(currentPin);
      if (!isUnique) {
        setError('This PIN is already in use. Please choose a different one.');
        setCurrentPin('');
        setConfirmPin('');
        setPinStep('pin');
        setIsSaving(false);
        return;
      }

      await createUser({
        name: currentName.trim(),
        email: currentEmail.trim() || null,
        pin: currentPin,
        role: currentRole,
      });

      setStaffMembers(prev => [
        ...prev,
        { name: currentName.trim(), email: currentEmail.trim(), role: currentRole, pin: '••••••', saved: true },
      ]);

      resetForm();
      Alert.alert('Staff Added', `${currentName.trim()} has been added as a ${ROLE_INFO[currentRole].label}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create user');
      setCurrentPin('');
      setConfirmPin('');
      setPinStep('pin');
    } finally {
      setIsSaving(false);
    }
  };

  const renderStaffList = () => (
    <View style={styles.staffList}>
      {staffMembers.map((member, index) => (
        <View key={index} style={styles.staffCard}>
          <View style={styles.staffCardLeft}>
            <Text style={styles.staffIcon}>{ROLE_INFO[member.role].icon}</Text>
            <View>
              <Text style={styles.staffName}>{member.name}</Text>
              <Text style={styles.staffRole}>{ROLE_INFO[member.role].label}</Text>
            </View>
          </View>
          <View style={styles.savedBadge}>
            <Text style={styles.savedBadgeText}>✓ Saved</Text>
          </View>
        </View>
      ))}
    </View>
  );

  const renderInfoForm = () => (
    <View style={styles.formSection}>
      <Text style={styles.formTitle}>Add Staff Member</Text>

      <Text style={styles.inputLabel}>Name *</Text>
      <TextInput style={styles.input} value={currentName} onChangeText={setCurrentName} placeholder="Enter name" autoCapitalize="words" />

      <Text style={styles.inputLabel}>Email (Optional)</Text>
      <TextInput
        style={styles.input}
        value={currentEmail}
        onChangeText={setCurrentEmail}
        placeholder="Enter email"
        keyboardType="email-address"
        autoCapitalize="none"
      />

      <Text style={styles.inputLabel}>Role *</Text>
      <View style={styles.roleGrid}>
        {(Object.keys(ROLE_INFO) as UserRole[])
          .filter(r => r !== 'admin')
          .map(role => (
            <TouchableOpacity
              key={role}
              style={[styles.roleCard, currentRole === role && styles.roleCardActive]}
              onPress={() => setCurrentRole(role)}
            >
              <Text style={styles.roleIcon}>{ROLE_INFO[role].icon}</Text>
              <Text style={[styles.roleLabel, currentRole === role && styles.roleLabelActive]}>{ROLE_INFO[role].label}</Text>
              <Text style={[styles.roleDesc, currentRole === role && styles.roleDescActive]}>{ROLE_INFO[role].description}</Text>
            </TouchableOpacity>
          ))}
      </View>

      <View style={styles.formButtons}>
        <TouchableOpacity style={styles.cancelButton} onPress={resetForm}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.pinButton} onPress={handleContinueToPin}>
          <Text style={styles.pinButtonText}>Set PIN →</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderPinEntry = () => (
    <View style={styles.pinSection}>
      <Text style={styles.pinTitle}>{pinStep === 'pin' ? 'Create PIN' : 'Confirm PIN'}</Text>
      <Text style={styles.pinSubtitle}>
        {pinStep === 'pin' ? `Enter a ${PIN_LENGTH}-digit PIN for ${currentName}` : `Re-enter the PIN to confirm`}
      </Text>

      {error && <Text style={styles.errorText}>{error}</Text>}

      <PinDisplay pinLength={PIN_LENGTH} filledCount={pinStep === 'pin' ? currentPin.length : confirmPin.length} />
      <PinKeypad onKeyPress={handleKeyPress} onDeletePress={handleDelete} disableBiometric />

      <TouchableOpacity
        style={styles.cancelButton}
        onPress={() => {
          if (pinStep === 'confirm') {
            setConfirmPin('');
            setPinStep('pin');
          } else {
            resetForm();
          }
        }}
      >
        <Text style={styles.cancelButtonText}>Back</Text>
      </TouchableOpacity>

      {isSaving && <Text style={styles.savingText}>Saving...</Text>}
    </View>
  );

  return (
    <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>Set Up Staff</Text>
      <Text style={styles.subtitle}>
        Add cashiers and managers who will use the POS system. Each user gets their own PIN to log in. You can always add more users later
        in Settings.
      </Text>

      {/* Existing staff */}
      {staffMembers.length > 0 && renderStaffList()}

      {/* Add form or button */}
      {isAdding ? (
        pinStep === 'info' ? (
          renderInfoForm()
        ) : (
          renderPinEntry()
        )
      ) : (
        <TouchableOpacity style={styles.addStaffButton} onPress={() => setIsAdding(true)}>
          <Text style={styles.addStaffIcon}>+</Text>
          <Text style={styles.addStaffText}>Add Staff Member</Text>
        </TouchableOpacity>
      )}

      {/* Navigation */}
      {!isAdding && (
        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.nextButton} onPress={onComplete}>
            <Text style={styles.nextButtonText}>{staffMembers.length > 0 ? 'Continue' : 'Skip for Now'}</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    padding: spacing.lg,
  },
  title: {
    fontSize: typography.fontSize.xxl,
    fontWeight: '700',
    marginBottom: spacing.xs,
    textAlign: 'center',
    color: lightColors.textPrimary,
  },
  subtitle: {
    fontSize: typography.fontSize.md,
    color: lightColors.textSecondary,
    marginBottom: spacing.lg,
    textAlign: 'center',
    lineHeight: 22,
  },
  staffList: {
    marginBottom: spacing.lg,
  },
  staffCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: lightColors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: lightColors.border,
    ...elevation.low,
  },
  staffCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  staffIcon: {
    fontSize: 24,
  },
  staffName: {
    fontSize: typography.fontSize.md,
    fontWeight: '600',
    color: lightColors.textPrimary,
  },
  staffRole: {
    fontSize: typography.fontSize.sm,
    color: lightColors.textSecondary,
  },
  savedBadge: {
    backgroundColor: lightColors.success + '20',
    borderRadius: borderRadius.round,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  savedBadgeText: {
    fontSize: typography.fontSize.xs,
    color: lightColors.success,
    fontWeight: '600',
  },
  addStaffButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderWidth: 2,
    borderColor: lightColors.primary,
    borderStyle: 'dashed',
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  addStaffIcon: {
    fontSize: 24,
    color: lightColors.primary,
    fontWeight: '700',
  },
  addStaffText: {
    fontSize: typography.fontSize.md,
    color: lightColors.primary,
    fontWeight: '600',
  },
  formSection: {
    marginBottom: spacing.lg,
  },
  formTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: lightColors.textPrimary,
    marginBottom: spacing.md,
  },
  inputLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
    color: lightColors.textSecondary,
    marginBottom: spacing.xs,
  },
  input: {
    borderWidth: 1,
    borderColor: lightColors.border,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    fontSize: typography.fontSize.md,
    backgroundColor: lightColors.surface,
    marginBottom: spacing.sm,
  },
  roleGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  roleCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: lightColors.border,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
    backgroundColor: lightColors.surface,
  },
  roleCardActive: {
    borderColor: lightColors.primary,
    backgroundColor: lightColors.primary + '10',
  },
  roleIcon: {
    fontSize: 24,
    marginBottom: spacing.xs,
  },
  roleLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: lightColors.textPrimary,
    marginBottom: 2,
  },
  roleLabelActive: {
    color: lightColors.primary,
  },
  roleDesc: {
    fontSize: typography.fontSize.xs,
    color: lightColors.textSecondary,
    textAlign: 'center',
  },
  roleDescActive: {
    color: lightColors.primary,
  },
  formButtons: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  cancelButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: lightColors.border,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  cancelButtonText: {
    color: lightColors.textSecondary,
    fontWeight: '600',
  },
  pinButton: {
    flex: 2,
    backgroundColor: lightColors.primary,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
  },
  pinButtonText: {
    color: lightColors.textOnPrimary,
    fontWeight: '600',
  },
  pinSection: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  pinTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: '600',
    marginBottom: spacing.xs,
    textAlign: 'center',
    color: lightColors.textPrimary,
  },
  pinSubtitle: {
    fontSize: typography.fontSize.sm,
    color: lightColors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  errorText: {
    color: lightColors.error,
    fontSize: typography.fontSize.sm,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  savingText: {
    color: lightColors.primary,
    fontSize: typography.fontSize.sm,
    marginTop: spacing.md,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginTop: spacing.md,
    paddingBottom: spacing.xl,
  },
  backButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: lightColors.border,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
  },
  backButtonText: {
    color: lightColors.textSecondary,
    fontWeight: '600',
    fontSize: typography.fontSize.md,
  },
  nextButton: {
    flex: 2,
    backgroundColor: lightColors.primary,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
  },
  nextButtonText: {
    color: lightColors.textOnPrimary,
    fontWeight: '600',
    fontSize: typography.fontSize.md,
  },
});

export default StaffSetupStep;
