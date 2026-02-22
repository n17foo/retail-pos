import React from 'react';
import { View, Text, StyleSheet, Button } from 'react-native';
import { useTranslate } from '../../hooks/useTranslate';
import { lightColors } from '../../utils/theme';

interface WelcomeStepProps {
  onNext: () => void;
}

const WelcomeStep: React.FC<WelcomeStepProps> = ({ onNext }) => {
  const { t } = useTranslate();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('welcome.title')}</Text>
      <Text style={styles.subtitle}>{t('welcome.subtitle')}</Text>
      <Text style={styles.description}>{t('welcome.description')}</Text>
      <Button title={t('common.getStarted')} onPress={onNext} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    color: lightColors.textSecondary,
    marginBottom: 20,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: lightColors.textPrimary,
    marginBottom: 40,
    textAlign: 'center',
  },
});

export default WelcomeStep;
