import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
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
import { auth, db } from "../../constants/firebase";

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }
    setLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email.trim(),
        password,
      );
      const userDoc = await getDoc(doc(db, "users", userCredential.user.uid));
      if (userDoc.exists()) {
        const role = userDoc.data().role;
        if (role === "lecturer") {
          router.replace("/screens/lecturerDashboard");
        } else {
          router.replace("/screens/studentDashboard");
        }
      }
    } catch (error: any) {
      Alert.alert(
        "Login Failed",
        "Invalid email or password. Please try again.",
      );
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

          <Text style={styles.title}>SmartAttend</Text>
          <Text style={styles.subtitle}>Ahmadu Bello University, Zaria</Text>
          <Text style={styles.subtitle2}>Smart Attendance System</Text>

          <View style={styles.form}>
            <Text style={styles.formTitle}>Welcome Back!</Text>

            <Text style={styles.label}>Email Address</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your email"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />

            <Text style={styles.label}>Password</Text>
            <View style={styles.passwordRow}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Enter your password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity
                style={styles.eyeBtn}
                onPress={() => setShowPassword(!showPassword)}
              >
                <Text style={styles.eyeIcon}>{showPassword ? "🙈" : "👁️"}</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.button}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Login</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.forgotLink}
              onPress={() => router.push("/screens/forgotPassword" as any)}
            >
              <Text style={styles.forgotLinkText}>Forgot Password?</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.registerLink}
              onPress={() => router.push("/screens/register")}
            >
              <Text style={styles.registerLinkText}>
                Don't have an account?{" "}
                <Text style={styles.registerLinkBold}>Register Here</Text>
              </Text>
            </TouchableOpacity>
          </View>

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
  subtitle: {
    fontSize: 13,
    color: "#fff",
    fontWeight: "600",
    opacity: 0.95,
    marginBottom: 2,
    textAlign: "center",
  },
  subtitle2: {
    fontSize: 12,
    color: "#fff",
    opacity: 0.85,
    marginBottom: 20,
    textAlign: "center",
  },
  form: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 25,
    width: "100%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  formTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1a73e8",
    marginBottom: 20,
    textAlign: "center",
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#333",
    marginBottom: 6,
    marginTop: 10,
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
  },
  button: {
    backgroundColor: "#1a73e8",
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: 22,
  },
  buttonText: { color: "#fff", fontSize: 17, fontWeight: "bold" },
  registerLink: { marginTop: 18, alignItems: "center" },
  registerLinkText: { fontSize: 14, color: "#666" },
  registerLinkBold: { color: "#1a73e8", fontWeight: "bold" },
  powered: { marginTop: 25, fontSize: 12, color: "#fff", opacity: 0.7 },

  passwordRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#eee",
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 15,
    color: "#333",
  },
  eyeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  eyeIcon: { fontSize: 18 },

  forgotLink: { marginTop: 12, alignSelf: "flex-end" },
  forgotLinkText: { fontSize: 13, color: "#1a73e8", fontWeight: "600" },
});
