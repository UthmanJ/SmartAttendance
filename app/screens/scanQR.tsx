import { Camera, CameraView } from "expo-camera";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  increment,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { auth, db } from "../../constants/firebase";

const ALLOWED_RADIUS_METERS = 500;

function getDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function ScanQRScreen() {
  const router = useRouter();
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [location, setLocation] = useState<any>(null);
  const [testingMode, setTestingMode] = useState(false);

  useEffect(() => {
    setupPermissions();
  }, []);

  const setupPermissions = async () => {
    const { status: cameraStatus } =
      await Camera.requestCameraPermissionsAsync();
    const { status: locationStatus } =
      await Location.requestForegroundPermissionsAsync();

    if (cameraStatus === "granted" && locationStatus === "granted") {
      setHasPermission(true);
      try {
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.BestForNavigation,
        });
        setLocation(loc.coords);
      } catch (error) {
        console.log("Initial location error:", error);
      }
    } else {
      setHasPermission(false);
      Alert.alert(
        "Permissions Required",
        "Camera and location permissions are required to mark attendance.",
      );
    }
  };

  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    if (scanned || processing) return;
    setScanned(true);
    setProcessing(true);

    try {
      // Parse QR data
      const qrPayload = JSON.parse(data);
      const { sessionId, courseCode, expiresAt } = qrPayload;

      // Check if QR code expired
      if (new Date() > new Date(expiresAt)) {
        Alert.alert(
          "❌ QR Code Expired",
          "This QR code has expired. Ask your lecturer to generate a new one.",
          [{ text: "OK", onPress: () => setScanned(false) }],
        );
        setProcessing(false);
        return;
      }

      // Get session details
      const sessionDoc = await getDoc(doc(db, "sessions", sessionId));
      if (!sessionDoc.exists() || !sessionDoc.data().isActive) {
        Alert.alert(
          "❌ Session Ended",
          "This attendance session is no longer active.",
          [{ text: "OK", onPress: () => setScanned(false) }],
        );
        setProcessing(false);
        return;
      }

      const sessionData = sessionDoc.data();

      // ✅ Location check — skipped in testing mode
      if (!testingMode) {
        // Get fresh location at scan time
        let currentLocation = location;
        try {
          const freshLoc = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.BestForNavigation,
          });
          currentLocation = freshLoc.coords;
          setLocation(currentLocation);
        } catch (locError) {
          console.log("Fresh location failed, using cached");
        }

        if (!currentLocation) {
          Alert.alert(
            "❌ Location Error",
            "Could not get your location. Please enable GPS and try again.",
            [{ text: "OK", onPress: () => setScanned(false) }],
          );
          setProcessing(false);
          return;
        }

        const distance = getDistanceMeters(
          currentLocation.latitude,
          currentLocation.longitude,
          sessionData.location.latitude,
          sessionData.location.longitude,
        );

        if (distance > ALLOWED_RADIUS_METERS) {
          Alert.alert(
            "❌ Too Far Away",
            `You are ${Math.round(distance)}m from the classroom.\n\nYou must be within ${ALLOWED_RADIUS_METERS}m to mark attendance.\n\nPlease make sure you are inside the lecture hall.`,
            [{ text: "Try Again", onPress: () => setScanned(false) }],
          );
          setProcessing(false);
          return;
        }
      }

      // Check if already marked attendance
      const currentUser = auth.currentUser;
      if (!currentUser) {
        setProcessing(false);
        return;
      }

      const existingQ = query(
        collection(db, "attendance"),
        where("sessionId", "==", sessionId),
        where("studentId", "==", currentUser.uid),
      );
      const existing = await getDocs(existingQ);

      if (!existing.empty) {
        Alert.alert(
          "⚠️ Already Marked",
          "You have already marked attendance for this session.",
          [{ text: "OK", onPress: () => router.back() }],
        );
        setProcessing(false);
        return;
      }

      // Get student info
      const studentDoc = await getDoc(doc(db, "users", currentUser.uid));
      const studentData = studentDoc.data();

      // Get location for record (use cached if fresh failed)
      const recordLocation = location || { latitude: 0, longitude: 0 };
      const recordDistance = testingMode
        ? 0
        : Math.round(
            getDistanceMeters(
              recordLocation.latitude,
              recordLocation.longitude,
              sessionData.location.latitude,
              sessionData.location.longitude,
            ),
          );

      // Mark attendance
      await addDoc(collection(db, "attendance"), {
        sessionId,
        studentId: currentUser.uid,
        studentName: studentData?.fullName,
        matricNumber: studentData?.matricNumber,
        department: studentData?.department,
        courseTitle: sessionData.courseTitle,
        courseCode: sessionData.courseCode,
        markedAt: new Date().toISOString(),
        location: {
          latitude: recordLocation.latitude,
          longitude: recordLocation.longitude,
        },
        distance: recordDistance,
        testingMode,
      });

      // Update attendance count
      await updateDoc(doc(db, "sessions", sessionId), {
        attendanceCount: increment(1),
      });

      Alert.alert(
        "✅ Attendance Marked!",
        testingMode
          ? `Attendance for ${sessionData.courseCode} recorded!\n\n⚠️ Marked in Testing Mode`
          : `Attendance for ${sessionData.courseCode} recorded!\n\nDistance from classroom: ${recordDistance}m ✅`,
        [{ text: "Great! 🎉", onPress: () => router.back() }],
      );
    } catch (error) {
      Alert.alert(
        "❌ Error",
        "Invalid QR code or something went wrong. Please try again.",
        [{ text: "OK", onPress: () => setScanned(false) }],
      );
    }
    setProcessing(false);
  };

  if (hasPermission === null) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#1a73e8" />
        <Text style={styles.centeredText}>Requesting permissions...</Text>
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={styles.centered}>
        <Text style={styles.centeredText}>
          Camera and location access required
        </Text>
        <TouchableOpacity style={styles.retryBtn} onPress={setupPermissions}>
          <Text style={styles.retryBtnText}>Grant Permissions</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>📷 Scan QR Code</Text>
        <View style={{ width: 60 }} />
      </View>

      {/* Camera */}
      <CameraView
        style={styles.camera}
        facing="back"
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
      />

      {/* Overlay */}
      <View style={styles.overlay}>
        <View
          style={[
            styles.scanFrame,
            { borderColor: testingMode ? "#e53935" : "#1a73e8" },
          ]}
        />

        <Text style={styles.scanInstruction}>
          Point your camera at the QR code displayed by your lecturer
        </Text>

        {processing && (
          <View style={styles.processingBox}>
            <ActivityIndicator color="#fff" size="small" />
            <Text style={styles.processingText}>
              {"  "}Verifying {testingMode ? "" : "location & "}marking
              attendance...
            </Text>
          </View>
        )}

        {/* Testing Mode Toggle */}
        <TouchableOpacity
          style={[
            styles.testingBtn,
            { backgroundColor: testingMode ? "#e53935" : "rgba(0,0,0,0.6)" },
          ]}
          onPress={() => {
            const newMode = !testingMode;
            setTestingMode(newMode);
            setScanned(false); // reset scan state when toggling
            Alert.alert(
              newMode ? "🔓 Testing Mode ON" : "🔒 Testing Mode OFF",
              newMode
                ? "Location check is DISABLED. Anyone can scan from anywhere.\n\nTurn OFF for real use!"
                : "Location check is ENABLED. Normal mode restored.",
            );
          }}
        >
          <Text style={styles.testingBtnText}>
            {testingMode ? "🔓 Testing Mode ON" : "🔒 Testing Mode OFF"}
          </Text>
        </TouchableOpacity>

        {location && !testingMode && (
          <Text style={styles.locationText}>📍 Location acquired ✅</Text>
        )}

        {scanned && !processing && (
          <TouchableOpacity
            style={styles.rescanBtn}
            onPress={() => setScanned(false)}
          >
            <Text style={styles.rescanBtnText}>Scan Again 🔄</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#1a73e8",
  },
  centeredText: {
    color: "#fff",
    fontSize: 16,
    marginTop: 15,
    textAlign: "center",
    paddingHorizontal: 30,
  },
  retryBtn: {
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 25,
    marginTop: 20,
  },
  retryBtnText: { color: "#1a73e8", fontWeight: "bold", fontSize: 15 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 55,
    paddingBottom: 15,
    paddingHorizontal: 20,
    backgroundColor: "#1a73e8",
    zIndex: 10,
  },
  backBtn: {
    backgroundColor: "rgba(255,255,255,0.25)",
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  backBtnText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
  headerTitle: { fontSize: 20, fontWeight: "bold", color: "#fff" },
  camera: { flex: 1 },
  overlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    top: 110,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  scanFrame: {
    width: 250,
    height: 250,
    borderWidth: 3,
    borderRadius: 15,
    backgroundColor: "transparent",
    marginBottom: 25,
  },
  scanInstruction: {
    color: "#fff",
    fontSize: 14,
    textAlign: "center",
    backgroundColor: "rgba(0,0,0,0.6)",
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
  },
  processingBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(26,115,232,0.9)",
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
  },
  processingText: { color: "#fff", fontSize: 14 },
  testingBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    marginBottom: 10,
  },
  testingBtnText: { color: "#fff", fontSize: 13, fontWeight: "bold" },
  locationText: {
    color: "#fff",
    fontSize: 13,
    backgroundColor: "rgba(39,174,96,0.8)",
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 12,
  },
  rescanBtn: {
    backgroundColor: "#1a73e8",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 30,
  },
  rescanBtnText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
});
