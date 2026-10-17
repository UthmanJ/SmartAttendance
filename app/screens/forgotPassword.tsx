import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { sendPasswordResetEmail } from "firebase/auth";
import { useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Image,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { auth } from "../../constants/firebase";

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleReset = async () => {
    if (!email.trim()) {
      Alert.alert("Error", "Please enter your email address");
      return;
    }

    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setSent(true);
    } catch (error: any) {
      if (error.code === "auth/user-not-found") {
        Alert.alert("Error", "No account found with this email address.");
      } else if (error.code === "auth/invalid-email") {
        Alert.alert("Error", "Please enter a valid email address.");
      } else {
        Alert.alert("Error", "Something went wrong. Please try again.");
      }
    }
    setLoading(false);
  };

  return (
    <LinearGradient colors={["#1a73e8", "#0d47a1"]} style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* ABU Logo */}
          <View style={styles.logoContainer}>
            <Image
              source={require("../../assets/abu-logo.png")}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>

          <Text style={styles.title}>Reset Password</Text>
          <Text style={styles.subtitle}>SmartAttend · ABU Zaria</Text>

          {!sent ? (
            <View style={styles.form}>
              <Text style={styles.formTitle}>Forgot Password?</Text>
              <Text style={styles.formDescription}>
                Enter your registered email address below and we'll send you a
                link to reset your password.
              </Text>

              <Text style={styles.label}>Email Address</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your email"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />

              <TouchableOpacity
                style={styles.button}
                onPress={handleReset}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>Send Reset Link 📧</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.backLink}
                onPress={() => router.back()}
              >
                <Text style={styles.backLinkText}>‹ Back to Login</Text>
              </TouchableOpacity>
            </View>
          ) : (
            // Success state
            <View style={styles.form}>
              <Text style={styles.successIcon}>📧</Text>
              <Text style={styles.successTitle}>Email Sent!</Text>
              <Text style={styles.successMessage}>
                A password reset link has been sent to:
              </Text>
              <Text style={styles.successEmail}>{email}</Text>
              <Text style={styles.successInstruction}>
                Please check your inbox (and spam folder) and follow the link to
                reset your password. The link expires in 1 hour.
              </Text>

              <TouchableOpacity
                style={styles.button}
                onPress={() => router.replace("/screens/login")}
              >
                <Text style={styles.buttonText}>Back to Login 🚀</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.resendLink}
                onPress={() => {
                  setSent(false);
                  setEmail("");
                }}
              >
                <Text style={styles.resendLinkText}>
                  Didn't receive it? Try again
                </Text>
              </TouchableOpacity>
            </View>
          )}

          <Text style={styles.powered}>Powered by BeeWave Tech Solutions</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    alignItems: "center",
    paddingTop: 50,
    paddingBottom: 40,
    paddingHorizontal: 20,
  },
  logoContainer: {
    backgroundColor: "#fff",
    borderRadius: 55,
    width: 100,
    height: 100,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
  },
  logo: { width: 75, height: 75 },
  title: { fontSize: 26, fontWeight: "bold", color: "#fff", marginBottom: 3 },
  subtitle: { fontSize: 13, color: "#fff", opacity: 0.9, marginBottom: 25 },
  form: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 25,
    width: "100%",
    elevation: 5,
    alignItems: "center",
  },
  formTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1a73e8",
    marginBottom: 10,
    textAlign: "center",
  },
  formDescription: {
    fontSize: 13,
    color: "#888",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 20,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#333",
    marginBottom: 6,
    alignSelf: "flex-start",
    width: "100%",
  },
  input: {
    backgroundColor: "#f5f5f5",
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 15,
    borderWidth: 1,
    borderColor: "#eee",
    color: "#333",
    width: "100%",
    marginBottom: 5,
  },
  button: {
    backgroundColor: "#1a73e8",
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: 18,
    width: "100%",
  },
  buttonText: { color: "#fff", fontSize: 17, fontWeight: "bold" },
  backLink: { marginTop: 18 },
  backLinkText: { fontSize: 14, color: "#1a73e8", fontWeight: "600" },
  successIcon: { fontSize: 55, marginBottom: 12 },
  successTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#1a73e8",
    marginBottom: 10,
  },
  successMessage: { fontSize: 14, color: "#666", textAlign: "center" },
  successEmail: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#333",
    marginVertical: 8,
    textAlign: "center",
  },
  successInstruction: {
    fontSize: 13,
    color: "#888",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 5,
  },
  resendLink: { marginTop: 15 },
  resendLinkText: { fontSize: 13, color: "#1a73e8" },
  powered: { marginTop: 25, fontSize: 12, color: "#fff", opacity: 0.7 },
});
