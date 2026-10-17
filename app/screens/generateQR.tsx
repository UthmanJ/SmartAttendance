import { LinearGradient } from "expo-linear-gradient";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import { addDoc, collection, doc, updateDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import QRCode from "react-native-qrcode-svg";
import { auth, db } from "../../constants/firebase";

export default function GenerateQRScreen() {
  const router = useRouter();
  const [courseTitle, setCourseTitle] = useState("");
  const [courseCode, setCourseCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [qrData, setQrData] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [location, setLocation] = useState<any>(null);
  const [sessionActive, setSessionActive] = useState(false);
  const [expiryMinutes, setExpiryMinutes] = useState("15");
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [expiryTime, setExpiryTime] = useState<Date | null>(null);

  useEffect(() => {
    getLocation();
  }, []);

  // ✅ Countdown timer — runs when session becomes active
  useEffect(() => {
    if (!sessionActive || !expiryTime) return;

    const interval = setInterval(() => {
      const remaining = Math.max(
        0,
        Math.floor((expiryTime.getTime() - Date.now()) / 1000),
      );
      setTimeLeft(remaining);

      if (remaining === 0) {
        clearInterval(interval);
        setSessionActive(false);
        setQrData(null);
        setSessionId(null);
        // Auto-deactivate session in Firestore
        if (sessionId) {
          updateDoc(doc(db, "sessions", sessionId), { isActive: false });
        }
        Alert.alert(
          "⏱️ Session Expired",
          "The QR code has expired and the session has been automatically ended.",
          [{ text: "OK" }],
        );
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [sessionActive, expiryTime]);

  const getLocation = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission Denied",
        "Location permission is required to set classroom location.",
      );
      return;
    }
    const loc = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.BestForNavigation,
    });
    setLocation(loc.coords);
  };

  const generateSession = async () => {
    if (!courseTitle.trim() || !courseCode.trim()) {
      Alert.alert("Error", "Please enter course title and code");
      return;
    }
    if (!location) {
      Alert.alert(
        "Error",
        "Location not available. Please wait or check permissions.",
      );
      return;
    }

    setLoading(true);
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) return;

      // Calculate expiry time
      const expiry = new Date();
      expiry.setMinutes(expiry.getMinutes() + parseInt(expiryMinutes));
      setExpiryTime(expiry);
      setTimeLeft(parseInt(expiryMinutes) * 60);

      // Create session in Firestore
      const sessionRef = await addDoc(collection(db, "sessions"), {
        lecturerId: currentUser.uid,
        courseTitle: courseTitle.trim(),
        courseCode: courseCode.trim().toUpperCase(),
        location: {
          latitude: location.latitude,
          longitude: location.longitude,
        },
        radius: 500,
        createdAt: new Date().toISOString(),
        expiresAt: expiry.toISOString(),
        isActive: true,
        attendanceCount: 0,
      });

      const qrPayload = JSON.stringify({
        sessionId: sessionRef.id,
        courseCode: courseCode.trim().toUpperCase(),
        expiresAt: expiry.toISOString(),
      });

      setQrData(qrPayload);
      setSessionId(sessionRef.id);
      setSessionActive(true);

      Alert.alert(
        "✅ Session Started!",
        `QR Code generated for ${courseCode.toUpperCase()}.\nValid for ${expiryMinutes} minutes.\nStudents must be within 100 meters of your location.`,
      );
    } catch (error) {
      Alert.alert("Error", "Failed to generate QR code. Please try again.");
    }
    setLoading(false);
  };

  const endSession = async () => {
    if (!sessionId) return;
    Alert.alert("End Session", "Are you sure you want to end this session?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "End Session",
        style: "destructive",
        onPress: async () => {
          await updateDoc(doc(db, "sessions", sessionId), { isActive: false });
          setQrData(null);
          setSessionId(null);
          setSessionActive(false);
          setExpiryTime(null);
          setTimeLeft(0);
          setCourseTitle("");
          setCourseCode("");
          Alert.alert(
            "✅ Session Ended",
            "Attendance session has been closed.",
          );
        },
      },
    ]);
  };

  // Format seconds into MM:SS
  const formatTimeLeft = () => {
    const mins = Math.floor(timeLeft / 60);
    const secs = String(timeLeft % 60).padStart(2, "0");
    return `${mins}:${secs}`;
  };

  return (
    <LinearGradient colors={["#1a73e8", "#0d47a1"]} style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Generate QR</Text>
        <View style={{ width: 60 }} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {!sessionActive ? (
            <View style={styles.formCard}>
              <Text style={styles.formTitle}>New Attendance Session</Text>

              <View
                style={[
                  styles.locationStatus,
                  { backgroundColor: location ? "#e8f5e9" : "#fff3e0" },
                ]}
              >
                <Text style={styles.locationStatusText}>
                  {location
                    ? "📍 Location captured ✅"
                    : "📍 Getting your location..."}
                </Text>
              </View>

              <Text style={styles.label}>Course Title *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Introduction to Computer Science"
                value={courseTitle}
                onChangeText={setCourseTitle}
              />

              <Text style={styles.label}>Course Code *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. CSC101"
                value={courseCode}
                onChangeText={setCourseCode}
                autoCapitalize="characters"
              />

              <Text style={styles.label}>QR Code Valid For (minutes)</Text>
              <TextInput
                style={styles.input}
                placeholder="15"
                value={expiryMinutes}
                onChangeText={setExpiryMinutes}
                keyboardType="numeric"
              />

              <View style={styles.infoBox}>
                <Text style={styles.infoText}>
                  ℹ️ Students must be within 100 meters of your current location
                  to mark attendance.
                </Text>
              </View>

              <TouchableOpacity
                style={[
                  styles.generateBtn,
                  (!location || loading) && styles.generateBtnDisabled,
                ]}
                onPress={generateSession}
                disabled={!location || loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.generateBtnText}>
                    Generate QR Code 📲
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.qrCard}>
              <Text style={styles.qrTitle}>Scan to Mark Attendance</Text>
              <Text style={styles.qrCourse}>
                {courseCode.toUpperCase()} — {courseTitle}
              </Text>

              {/* ✅ Countdown Timer */}
              <View
                style={[
                  styles.timerBox,
                  { backgroundColor: timeLeft < 60 ? "#fce4ec" : "#e8f0fe" },
                ]}
              >
                <Text
                  style={[
                    styles.timerText,
                    { color: timeLeft < 60 ? "#e53935" : "#1a73e8" },
                  ]}
                >
                  ⏱️ Expires in: {formatTimeLeft()}
                </Text>
              </View>

              <View style={styles.qrContainer}>
                {qrData && (
                  <QRCode
                    value={qrData}
                    size={220}
                    color="#1a73e8"
                    backgroundColor="white"
                  />
                )}
              </View>

              <View style={styles.qrInfoRow}>
                <View style={styles.qrInfoItem}>
                  <Text style={styles.qrInfoIcon}>⏱️</Text>
                  <Text style={styles.qrInfoText}>
                    Valid for {expiryMinutes} mins
                  </Text>
                </View>
                <View style={styles.qrInfoItem}>
                  <Text style={styles.qrInfoIcon}>📍</Text>
                  <Text style={styles.qrInfoText}>100m radius</Text>
                </View>
                <View style={styles.qrInfoItem}>
                  <Text style={styles.qrInfoIcon}>🟢</Text>
                  <Text style={styles.qrInfoText}>Active</Text>
                </View>
              </View>

              <Text style={styles.qrInstruction}>
                Show this QR code to your students. They must be physically
                present to scan it.
              </Text>

              <TouchableOpacity
                style={styles.viewAttendanceBtn}
                onPress={() =>
                  router.push({
                    pathname: "/screens/attendanceRecords",
                    params: { sessionId, courseTitle },
                  })
                }
              >
                <Text style={styles.viewAttendanceBtnText}>
                  👥 View Attendance
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.endSessionBtn}
                onPress={endSession}
              >
                <Text style={styles.endSessionBtnText}>⏹️ End Session</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 55,
    paddingBottom: 15,
    paddingHorizontal: 20,
  },
  backBtn: {
    backgroundColor: "rgba(255,255,255,0.25)",
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  backBtnText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
  headerTitle: { fontSize: 20, fontWeight: "bold", color: "#fff" },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },
  formCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 22,
    marginBottom: 20,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1a73e8",
    marginBottom: 15,
    textAlign: "center",
  },
  locationStatus: { borderRadius: 10, padding: 12, marginBottom: 15 },
  locationStatusText: { fontSize: 14, color: "#333", textAlign: "center" },
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
  },
  infoBox: {
    backgroundColor: "#e8f0fe",
    borderRadius: 10,
    padding: 12,
    marginTop: 15,
  },
  infoText: { fontSize: 13, color: "#1a73e8", lineHeight: 18 },
  generateBtn: {
    backgroundColor: "#1a73e8",
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: 20,
  },
  generateBtnDisabled: { opacity: 0.6 },
  generateBtnText: { color: "#fff", fontSize: 17, fontWeight: "bold" },
  qrCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 25,
    alignItems: "center",
  },
  qrTitle: { fontSize: 18, fontWeight: "bold", color: "#333", marginBottom: 5 },
  qrCourse: {
    fontSize: 14,
    color: "#1a73e8",
    fontWeight: "600",
    marginBottom: 15,
    textAlign: "center",
  },
  timerBox: {
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginBottom: 15,
    width: "100%",
  },
  timerText: { fontSize: 18, fontWeight: "bold", textAlign: "center" },
  qrContainer: {
    padding: 20,
    backgroundColor: "#fff",
    borderRadius: 15,
    elevation: 3,
    marginBottom: 20,
  },
  qrInfoRow: { flexDirection: "row", gap: 15, marginBottom: 15 },
  qrInfoItem: { alignItems: "center" },
  qrInfoIcon: { fontSize: 20, marginBottom: 3 },
  qrInfoText: { fontSize: 11, color: "#666" },
  qrInstruction: {
    fontSize: 13,
    color: "#888",
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 18,
  },
  viewAttendanceBtn: {
    backgroundColor: "#e8f0fe",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 30,
    marginBottom: 12,
    width: "100%",
    alignItems: "center",
  },
  viewAttendanceBtnText: { color: "#1a73e8", fontSize: 15, fontWeight: "bold" },
  endSessionBtn: {
    backgroundColor: "#fce4ec",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 30,
    width: "100%",
    alignItems: "center",
  },
  endSessionBtnText: { color: "#e53935", fontSize: 15, fontWeight: "bold" },
});
