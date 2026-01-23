import React, { useState, useRef } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Animated,
  Dimensions,
  TouchableOpacity,
  useColorScheme,
  Image,
} from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Text } from './Themed';
import { Button } from './Button';
import Colors from '../constants/Colors';
import { useAuth } from '../hooks/useAuth';
import { StorageService } from '../services/storage.service';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const ONBOARDING_COMPLETE_KEY = 'onboarding_complete';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: string;
  iconColor: string;
  action?: {
    label: string;
    onPress: () => Promise<void> | void;
  };
  optional?: boolean;
}

interface Props {
  onComplete: () => void;
}

export function OnboardingFlow({ onComplete }: Props) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const router = useRouter();
  const { signIn, isSignedIn } = useAuth();
  const scrollViewRef = useRef<ScrollView>(null);
  
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const steps: OnboardingStep[] = [
    {
      id: 'welcome',
      title: 'Welcome to Pet Genie',
      description: 'Your all-in-one assistant for managing pet care visits. Let\'s get you set up in just a few steps.',
      icon: 'paw',
      iconColor: '#3B82F6',
    },
    {
      id: 'calendar',
      title: 'Connect Your Calendar',
      description: 'Sync with Google Calendar to automatically import your visits and keep everything organized.',
      icon: 'calendar',
      iconColor: '#10B981',
      action: {
        label: isSignedIn ? 'Connected ✓' : 'Connect Google Calendar',
        onPress: async () => {
          if (!isSignedIn) {
            setLoading(true);
            try {
              await signIn();
              markStepComplete('calendar');
            } catch (error) {
              console.error('Sign in failed:', error);
            } finally {
              setLoading(false);
            }
          }
        },
      },
      optional: false,
    },
    {
      id: 'clients',
      title: 'Add Your Clients',
      description: 'Create client profiles with pet details. You can link events to clients for better organization.',
      icon: 'users',
      iconColor: '#8B5CF6',
      action: {
        label: 'Add First Client',
        onPress: () => {
          // Navigate to clients tab - using direct path
          router.push('/client/new');
        },
      },
      optional: true,
    },
    {
      id: 'templates',
      title: 'Create Visit Templates',
      description: 'Set up templates for common visit types to quickly log visits with consistent details.',
      icon: 'file-text-o',
      iconColor: '#F59E0B',
      action: {
        label: 'Create Template',
        onPress: () => {
          router.push('/templates');
        },
      },
      optional: true,
    },
    {
      id: 'complete',
      title: 'You\'re All Set!',
      description: 'Start managing your pet care visits with ease. You can always adjust settings later.',
      icon: 'check-circle',
      iconColor: '#10B981',
    },
  ];

  const markStepComplete = (stepId: string) => {
    setCompletedSteps((prev) => new Set([...prev, stepId]));
  };

  const goToStep = (index: number) => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(() => {
      setCurrentStep(index);
      scrollViewRef.current?.scrollTo({ x: index * SCREEN_WIDTH, animated: false });
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }).start();
    });
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      goToStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handleSkip = () => {
    handleComplete();
  };

  const handleComplete = async () => {
    await StorageService.set(ONBOARDING_COMPLETE_KEY, true);
    onComplete();
  };

  const currentStepData = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;
  const canProceed = 
    !currentStepData.action || 
    currentStepData.optional || 
    completedSteps.has(currentStepData.id) ||
    (currentStepData.id === 'calendar' && isSignedIn);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Progress Dots */}
      <View style={styles.progressContainer}>
        {steps.map((step, index) => (
          <View
            key={step.id}
            style={[
              styles.progressDot,
              {
                backgroundColor:
                  index === currentStep
                    ? colors.tint
                    : index < currentStep
                    ? colors.tint + '60'
                    : colors.tabIconDefault + '40',
              },
            ]}
          />
        ))}
      </View>

      {/* Skip Button */}
      {!isLastStep && (
        <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
          <Text style={[styles.skipText, { color: colors.tabIconDefault }]}>
            Skip
          </Text>
        </TouchableOpacity>
      )}

      {/* Step Content */}
      <Animated.View style={[styles.contentContainer, { opacity: fadeAnim }]}>
        {/* Icon */}
        <View
          style={[
            styles.iconContainer,
            { backgroundColor: currentStepData.iconColor + '15' },
          ]}
        >
          <FontAwesome
            name={currentStepData.icon as any}
            size={60}
            color={currentStepData.iconColor}
          />
        </View>

        {/* Text */}
        <Text style={[styles.title, { color: colors.text }]}>
          {currentStepData.title}
        </Text>
        <Text style={[styles.description, { color: colors.tabIconDefault }]}>
          {currentStepData.description}
        </Text>

        {/* Action Button */}
        {currentStepData.action && (
          <TouchableOpacity
            style={[
              styles.actionButton,
              {
                backgroundColor: completedSteps.has(currentStepData.id) || 
                  (currentStepData.id === 'calendar' && isSignedIn)
                  ? '#10B981'
                  : colors.tint,
              },
            ]}
            onPress={currentStepData.action.onPress}
            disabled={loading || (currentStepData.id === 'calendar' && isSignedIn)}
          >
            {loading ? (
              <Text style={styles.actionButtonText}>Connecting...</Text>
            ) : (
              <Text style={styles.actionButtonText}>
                {currentStepData.id === 'calendar' && isSignedIn
                  ? 'Connected ✓'
                  : currentStepData.action.label}
              </Text>
            )}
          </TouchableOpacity>
        )}

        {currentStepData.optional && (
          <Text style={[styles.optionalText, { color: colors.tabIconDefault }]}>
            You can do this later
          </Text>
        )}
      </Animated.View>

      {/* Navigation */}
      <View style={styles.navigationContainer}>
        {currentStep > 0 && (
          <TouchableOpacity
            style={[styles.navButton, { borderColor: colors.tabIconDefault }]}
            onPress={() => goToStep(currentStep - 1)}
          >
            <FontAwesome name="arrow-left" size={16} color={colors.tabIconDefault} />
          </TouchableOpacity>
        )}
        <View style={{ flex: 1 }} />
        <TouchableOpacity
          style={[
            styles.nextButton,
            {
              backgroundColor: canProceed ? colors.tint : colors.tabIconDefault,
              opacity: canProceed ? 1 : 0.5,
            },
          ]}
          onPress={handleNext}
          disabled={!canProceed}
        >
          <Text style={styles.nextButtonText}>
            {isLastStep ? 'Get Started' : 'Next'}
          </Text>
          {!isLastStep && (
            <FontAwesome name="arrow-right" size={14} color="#fff" style={{ marginLeft: 8 }} />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

/**
 * Check if onboarding has been completed
 */
export async function isOnboardingComplete(): Promise<boolean> {
  const complete = await StorageService.get<boolean>(ONBOARDING_COMPLETE_KEY);
  return complete === true;
}

/**
 * Reset onboarding status (for testing)
 */
export async function resetOnboarding(): Promise<void> {
  await StorageService.remove(ONBOARDING_COMPLETE_KEY);
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 60,
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 20,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  skipButton: {
    position: 'absolute',
    top: 60,
    right: 20,
    padding: 8,
  },
  skipText: {
    fontSize: 16,
  },
  contentContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  iconContainer: {
    width: 140,
    height: 140,
    borderRadius: 70,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  actionButton: {
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 25,
    marginBottom: 12,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  optionalText: {
    fontSize: 13,
    fontStyle: 'italic',
  },
  navigationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 40,
    gap: 12,
  },
  navButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 25,
  },
  nextButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
