import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, TextInput, Button, Surface, useTheme, HelperText, Chip } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useMutation } from '@apollo/client';

import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import { REGISTER_MUTATION } from '../../types/queries';
import { LoadingScreen } from '../../components/common/LoadingScreen';

const USER_ROLES = [
  { key: 'client', label: 'Client', description: 'Looking for services' },
  { key: 'hub', label: 'Hub Owner', description: 'Own a barbershop/salon' },
  { key: 'professional', label: 'Professional', description: 'Barber/stylist' },
  { key: 'brand', label: 'Brand', description: 'Product company' },
  { key: 'trainer', label: 'Trainer', description: 'Educator/trainer' },
];

export const RegisterScreen: React.FC = () => {
  const theme = useTheme();
  const navigation = useNavigation();
  const { login } = useAuth();
  const { showNotification } = useNotification();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    displayName: '',
  });

  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [registerMutation] = useMutation(REGISTER_MUTATION);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    // Email validation
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email';
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    // Confirm password validation
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    // Display name validation
    if (!formData.displayName.trim()) {
      newErrors.displayName = 'Display name is required';
    }

    // Roles validation
    if (selectedRoles.length === 0) {
      newErrors.roles = 'Please select at least one role';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRoleToggle = (roleKey: string) => {
    setSelectedRoles(prev => {
      if (prev.includes(roleKey)) {
        return prev.filter(role => role !== roleKey);
      } else {
        return [...prev, roleKey];
      }
    });

    // Clear role error when user selects a role
    if (errors.roles) {
      setErrors({ ...errors, roles: '' });
    }
  };

  const handleRegister = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      const { data } = await registerMutation({
        variables: {
          input: {
            email: formData.email.trim(),
            password: formData.password,
            displayName: formData.displayName.trim(),
            roles: selectedRoles,
            currentRole: selectedRoles[0], // Set first selected role as current
          },
        },
      });

      if (data?.register) {
        await login(
          { token: data.register.token, refreshToken: data.register.refreshToken },
          data.register.user
        );
        showNotification('Account created successfully!', 'success');
      }
    } catch (error: any) {
      console.error('Registration error:', error);
      const message = error.message || 'Registration failed. Please try again.';
      showNotification(message, 'error');

      if (message.includes('User already exists')) {
        setErrors({ ...errors, email: 'An account with this email already exists' });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const updateFormData = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    // Clear field-specific error when user starts typing
    if (errors[field]) {
      setErrors({ ...errors, [field]: '' });
    }
  };

  if (isLoading) {
    return <LoadingScreen message="Creating your account..." />;
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text variant="headlineMedium" style={[styles.title, { color: theme.colors.primary }]}>
            Join SnipShift
          </Text>
          <Text variant="bodyLarge" style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
            Create your account and join the creative community
          </Text>
        </View>

        {/* Registration Form */}
        <Surface style={[styles.formContainer, { backgroundColor: theme.colors.surface }]} elevation={2}>
          <TextInput
            label="Email"
            value={formData.email}
            onChangeText={(text) => updateFormData('email', text)}
            mode="outlined"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            error={!!errors.email}
            style={styles.input}
          />
          {errors.email && (
            <HelperText type="error" visible={!!errors.email}>
              {errors.email}
            </HelperText>
          )}

          <TextInput
            label="Display Name"
            value={formData.displayName}
            onChangeText={(text) => updateFormData('displayName', text)}
            mode="outlined"
            autoComplete="name"
            error={!!errors.displayName}
            style={styles.input}
          />
          {errors.displayName && (
            <HelperText type="error" visible={!!errors.displayName}>
              {errors.displayName}
            </HelperText>
          )}

          <TextInput
            label="Password"
            value={formData.password}
            onChangeText={(text) => updateFormData('password', text)}
            mode="outlined"
            secureTextEntry
            autoComplete="password-new"
            error={!!errors.password}
            style={styles.input}
          />
          {errors.password && (
            <HelperText type="error" visible={!!errors.password}>
              {errors.password}
            </HelperText>
          )}

          <TextInput
            label="Confirm Password"
            value={formData.confirmPassword}
            onChangeText={(text) => updateFormData('confirmPassword', text)}
            mode="outlined"
            secureTextEntry
            autoComplete="password-new"
            error={!!errors.confirmPassword}
            style={styles.input}
          />
          {errors.confirmPassword && (
            <HelperText type="error" visible={!!errors.confirmPassword}>
              {errors.confirmPassword}
            </HelperText>
          )}

          {/* Role Selection */}
          <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
            Select Your Role(s)
          </Text>
          <Text variant="bodySmall" style={[styles.sectionSubtitle, { color: theme.colors.onSurfaceVariant }]}>
            You can select multiple roles and switch between them later
          </Text>

          <View style={styles.rolesContainer}>
            {USER_ROLES.map((role) => (
              <Chip
                key={role.key}
                mode={selectedRoles.includes(role.key) ? 'flat' : 'outlined'}
                selected={selectedRoles.includes(role.key)}
                onPress={() => handleRoleToggle(role.key)}
                style={styles.roleChip}
                textStyle={{ color: selectedRoles.includes(role.key) ? theme.colors.onPrimary : theme.colors.onSurface }}
              >
                {role.label}
              </Chip>
            ))}
          </View>

          {errors.roles && (
            <HelperText type="error" visible={!!errors.roles}>
              {errors.roles}
            </HelperText>
          )}

          <Button
            mode="contained"
            onPress={handleRegister}
            loading={isLoading}
            disabled={isLoading}
            style={styles.registerButton}
          >
            Create Account
          </Button>
        </Surface>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: theme.colors.onSurfaceVariant }]}>
            Already have an account?{' '}
            <Text
              style={[styles.linkText, { color: theme.colors.primary }]}
              onPress={() => navigation.navigate('Login' as never)}
            >
              Sign in
            </Text>
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  header: {
    alignItems: 'center',
    marginTop: 32,
    marginBottom: 32,
  },
  title: {
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  formContainer: {
    padding: 24,
    borderRadius: 12,
    marginBottom: 24,
  },
  input: {
    marginBottom: 8,
  },
  sectionTitle: {
    marginTop: 16,
    marginBottom: 4,
    fontWeight: 'bold',
  },
  sectionSubtitle: {
    marginBottom: 16,
  },
  rolesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  roleChip: {
    marginBottom: 4,
  },
  registerButton: {
    marginTop: 16,
  },
  footer: {
    alignItems: 'center',
  },
  footerText: {
    textAlign: 'center',
  },
  linkText: {
    fontWeight: 'bold',
  },
});
