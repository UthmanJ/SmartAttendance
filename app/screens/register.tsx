import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
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

export default function RegisterScreen() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"student" | "lecturer">("student");
  const [matricNumber, setMatricNumber] = useState("");
  const [department, setDepartment] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleRegister = async () => {
    if (
      !fullName.trim() ||
      !email.trim() ||
      !password.trim() ||
      !department.trim()
    ) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }
    if (role === "student" && !matricNumber.trim()) {
      Alert.alert("Error", "Please enter your matric number");
      return;
    }
    if (password.length < 6) {
      Alert.alert("Error", "Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email.trim(),
        password,
      );
      await setDoc(doc(db, "users", userCredential.user.uid), {
        fullName: fullName.trim(),
        email: email.trim(),
        role,
        department: department.trim(),
        matricNumber: role === "student" ? matricNumber.trim() : "",
        createdAt: new Date().toISOString(),
      });

      Alert.alert(
        "✅ Account Created!",
        `Welcome ${fullName.split(" ")[0]}! Your account has been created successfully.`,
        [
          {
            text: "Continue",
            onPress: () => {
              if (role === "lecturer") {
                router.replace("/screens/lecturerDashboard");
              } else {
                router.replace("/screens/studentDashboard");
              }
            },
          },
        ],
      );
    } catch (error: any) {
      if (error.code === "auth/email-already-in-use") {
        Alert.alert(
          "Error",
          "This email is already registered. Please login instead.",
        );
      } else {
        Alert.alert("Error", "Registration failed. Please try again.");
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

          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Ahmadu Bello University, Zaria</Text>

          <View style={styles.form}>
            {/* Role Selector */}
            <Text style={styles.label}>I am a:</Text>
            <View style={styles.roleRow}>
              <TouchableOpacity
                style={[
                  styles.roleBtn,
                  role === "student" && styles.roleBtnActive,
                ]}
                onPress={() => setRole("student")}
              >
                <Text style={styles.roleIcon}>🎓</Text>
                <Text
                  style={[
                    styles.roleBtnText,
                    role === "student" && styles.roleBtnTextActive,
                  ]}
                >
                  Student
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.roleBtn,
                  role === "lecturer" && styles.roleBtnActive,
                ]}
                onPress={() => setRole("lecturer")}
              >
                <Text style={styles.roleIcon}>👨‍🏫</Text>
                <Text
                  style={[
                    styles.roleBtnText,
                    role === "lecturer" && styles.roleBtnTextActive,
                  ]}
                >
                  Lecturer
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>Full Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Sumayya Usamah Imam"
              value={fullName}
              onChangeText={setFullName}
              autoCapitalize="words"
            />

            <Text style={styles.label}>Email Address *</Text>
            <TextInput
              style={styles.input}
              placeholder="your@email.com"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />

            <Text style={styles.label}>Department *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Computer Science"
              value={department}
              onChangeText={setDepartment}
            />

            {role === "student" && (
              <>
                <Text style={styles.label}>Matric Number *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. U23CS2045"
                  value={matricNumber}
                  onChangeText={setMatricNumber}
                  autoCapitalize="characters"
                />
              </>
            )}

            <Text style={styles.label}>Password *</Text>
            <View style={styles.passwordRow}>
              <TextInput
                style={styles.passwordInput}
                placeholder="At least 6 characters"
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
              onPress={handleRegister}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Create Account</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.loginLink}
              onPress={() => router.replace("/screens/login")}
            >
              <Text style={styles.loginLinkText}>
                Already have an account?{" "}
                <Text style={styles.loginLinkBold}>Login Here</Text>
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
  title: { fontSize: 24, fontWeight: "bold", color: "#fff", marginBottom: 3 },
  subtitle: {
    fontSize: 13,
    color: "#fff",
    fontWeight: "600",
    opacity: 0.95,
    marginBottom: 20,
    textAlign: "center",
  },
  form: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 25,
    width: "100%",
    elevation: 5,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#333",
    marginBottom: 6,
    marginTop: 10,
  },
  roleRow: { flexDirection: "row", gap: 12, marginBottom: 5 },
  roleBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#eee",
    alignItems: "center",
  },
  roleBtnActive: { borderColor: "#1a73e8", backgroundColor: "#e8f0fe" },
  roleIcon: { fontSize: 24, marginBottom: 4 },
  roleBtnText: { fontSize: 14, color: "#888", fontWeight: "600" },
  roleBtnTextActive: { color: "#1a73e8" },
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
  loginLink: { marginTop: 18, alignItems: "center" },
  loginLinkText: { fontSize: 14, color: "#666" },
  loginLinkBold: { color: "#1a73e8", fontWeight: "bold" },
  powered: { marginTop: 20, fontSize: 12, color: "#fff", opacity: 0.7 },

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
});
