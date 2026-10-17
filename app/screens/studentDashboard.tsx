import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { signOut } from "firebase/auth";
import {
    collection,
    doc,
    getDoc,
    getDocs,
    orderBy,
    query,
    where,
} from "firebase/firestore";
import { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { auth, db } from "../../constants/firebase";

export default function StudentDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) return;

      // Fixed: no dynamic import
      const userDoc = await getDoc(doc(db, "users", currentUser.uid));
      if (userDoc.exists()) setUser(userDoc.data());

      const q = query(
        collection(db, "attendance"),
        where("studentId", "==", currentUser.uid),
        orderBy("markedAt", "desc"),
      );
      const snapshot = await getDocs(q);
      setAttendanceRecords(
        snapshot.docs.map((d) => ({ id: d.id, ...d.data() })),
      );
    } catch (error) {
      console.log("Error:", error);
    }
    setLoading(false);
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, []);

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          await signOut(auth);
          router.replace("/screens/login");
        },
      },
    ]);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <LinearGradient colors={["#1a73e8", "#0d47a1"]} style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#fff"
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>
              🎓 {user?.fullName?.split(" ")[0] || "Student"}
            </Text>
            <Text style={styles.subGreeting}>
              {user?.matricNumber} · {user?.department}
            </Text>
          </View>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statIcon}>✅</Text>
            <Text style={styles.statValue}>{attendanceRecords.length}</Text>
            <Text style={styles.statLabel}>Classes Attended</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statIcon}>📅</Text>
            <Text style={styles.statValue}>
              {new Set(attendanceRecords.map((r) => r.courseCode)).size}
            </Text>
            <Text style={styles.statLabel}>Courses</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statIcon}>🏆</Text>
            <Text style={styles.statValue}>
              {attendanceRecords.length > 0 ? "100%" : "0%"}
            </Text>
            <Text style={styles.statLabel}>Rate</Text>
          </View>
        </View>

        {/* Scan QR Button */}
        <TouchableOpacity
          style={styles.scanBtn}
          onPress={() => router.push("/screens/scanQR")}
        >
          <Text style={styles.scanBtnIcon}>📷</Text>
          <View style={styles.scanBtnText}>
            <Text style={styles.scanBtnTitle}>Scan QR Code</Text>
            <Text style={styles.scanBtnSub}>Mark your attendance now</Text>
          </View>
          <Text style={styles.scanBtnArrow}>›</Text>
        </TouchableOpacity>

        {/* Attendance History */}
        <Text style={styles.sectionTitle}>My Attendance History</Text>

        {loading ? (
          <ActivityIndicator
            color="#fff"
            size="large"
            style={{ marginTop: 20 }}
          />
        ) : attendanceRecords.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyText}>No attendance records yet</Text>
            <Text style={styles.emptySubtext}>
              Scan a QR code in class to mark your attendance
            </Text>
          </View>
        ) : (
          attendanceRecords.map((record) => (
            <View key={record.id} style={styles.recordCard}>
              <View style={styles.recordLeft}>
                <Text style={styles.recordCourse}>{record.courseTitle}</Text>
                <Text style={styles.recordCode}>{record.courseCode}</Text>
                <Text style={styles.recordDate}>
                  {formatDate(record.markedAt)}
                </Text>
              </View>
              <View style={styles.recordRight}>
                <Text style={styles.recordStatus}>✅</Text>
                <Text style={styles.recordStatusText}>Present</Text>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingTop: 60, paddingHorizontal: 20, paddingBottom: 40 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  greeting: { fontSize: 22, fontWeight: "bold", color: "#fff" },
  subGreeting: { fontSize: 12, color: "#fff", opacity: 0.85 },
  logoutBtn: {
    backgroundColor: "rgba(255,255,255,0.25)",
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  logoutText: { color: "#fff", fontWeight: "bold", fontSize: 13 },
  statsRow: { flexDirection: "row", gap: 10, marginBottom: 20 },
  statCard: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 15,
    padding: 15,
    alignItems: "center",
  },
  statIcon: { fontSize: 24, marginBottom: 5 },
  statValue: { fontSize: 20, fontWeight: "bold", color: "#fff" },
  statLabel: {
    fontSize: 10,
    color: "#fff",
    opacity: 0.85,
    textAlign: "center",
    marginTop: 2,
  },
  scanBtn: {
    backgroundColor: "#fff",
    borderRadius: 15,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 25,
    elevation: 4,
  },
  scanBtnIcon: { fontSize: 35, marginRight: 15 },
  scanBtnText: { flex: 1 },
  scanBtnTitle: { fontSize: 17, fontWeight: "bold", color: "#1a73e8" },
  scanBtnSub: { fontSize: 12, color: "#888", marginTop: 2 },
  scanBtnArrow: { fontSize: 28, color: "#1a73e8" },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 12,
  },
  emptyCard: {
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 15,
    padding: 30,
    alignItems: "center",
  },
  emptyIcon: { fontSize: 50, marginBottom: 10 },
  emptyText: {
    fontSize: 17,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 5,
  },
  emptySubtext: {
    fontSize: 13,
    color: "#fff",
    opacity: 0.8,
    textAlign: "center",
  },
  recordCard: {
    backgroundColor: "#fff",
    borderRadius: 15,
    padding: 15,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  recordLeft: { flex: 1 },
  recordCourse: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 3,
  },
  recordCode: { fontSize: 13, color: "#1a73e8", marginBottom: 3 },
  recordDate: { fontSize: 12, color: "#888" },
  recordRight: { alignItems: "center" },
  recordStatus: { fontSize: 28 },
  recordStatusText: { fontSize: 11, color: "#27ae60", fontWeight: "bold" },
});
