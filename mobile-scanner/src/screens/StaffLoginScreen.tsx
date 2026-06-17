import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

type StaffLoginScreenProps = {
  email: string;
  password: string;
  errorMessage: string | null;
  isSubmitting: boolean;
  onChangeEmail: (email: string) => void;
  onChangePassword: (password: string) => void;
  onSubmit: () => void;
};

export function StaffLoginScreen({
  email,
  password,
  errorMessage,
  isSubmitting,
  onChangeEmail,
  onChangePassword,
  onSubmit,
}: StaffLoginScreenProps) {
  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}
      >
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.kicker}>TicketBox Scanner</Text>
            <Text style={styles.title}>Staff sign in</Text>
            <Text style={styles.copy}>Use a STAFF account before loading offline gate data.</Text>
          </View>

          <View style={styles.form}>
            <View style={styles.field}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                autoCapitalize="none"
                autoComplete="email"
                editable={!isSubmitting}
                inputMode="email"
                keyboardType="email-address"
                onChangeText={onChangeEmail}
                placeholder="staff@example.com"
                placeholderTextColor="#7a8991"
                style={styles.input}
                value={email}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Password</Text>
              <TextInput
                autoCapitalize="none"
                editable={!isSubmitting}
                onChangeText={onChangePassword}
                placeholder="Password"
                placeholderTextColor="#7a8991"
                secureTextEntry
                style={styles.input}
                value={password}
              />
            </View>

            {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

            <Pressable
              disabled={isSubmitting}
              onPress={onSubmit}
              style={({ pressed }) => [
                styles.primaryButton,
                (pressed || isSubmitting) && styles.primaryButtonPressed,
              ]}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.primaryButtonText}>Sign in</Text>
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#eef4f2',
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    gap: 24,
    padding: 20,
  },
  header: {
    gap: 8,
  },
  kicker: {
    color: '#287565',
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  title: {
    color: '#162126',
    fontSize: 30,
    fontWeight: '800',
  },
  copy: {
    color: '#52636b',
    fontSize: 16,
    lineHeight: 23,
  },
  form: {
    gap: 16,
    padding: 18,
    borderRadius: 8,
    backgroundColor: '#ffffff',
    borderColor: '#d7e3df',
    borderWidth: 1,
  },
  field: {
    gap: 8,
  },
  label: {
    color: '#26343a',
    fontSize: 14,
    fontWeight: '700',
  },
  input: {
    minHeight: 50,
    borderRadius: 8,
    borderColor: '#b9c8c3',
    borderWidth: 1,
    color: '#162126',
    fontSize: 16,
    paddingHorizontal: 14,
    backgroundColor: '#f9fbfa',
  },
  errorText: {
    color: '#b42318',
    fontSize: 14,
    lineHeight: 20,
  },
  primaryButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
    borderRadius: 8,
    backgroundColor: '#287565',
  },
  primaryButtonPressed: {
    opacity: 0.78,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
  },
});
