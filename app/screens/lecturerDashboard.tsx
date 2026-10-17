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

export default function LecturerDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [sessions, setSessions] = useState<any[]>([]);
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

      // Get user profile
      const userDoc = await getDoc(doc(db, "users", currentUser.uid));
      if (userDoc.exists()) setUser(userDoc.data());

      // Get recent sessions
      const q = query(
        collection(db, "sessions"),
        where("lecturerId", "==", currentUser.uid),
        orderBy("createdAt", "desc"),
      );
      const snapshot = await getDocs(q);
      setSessions(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (error) {
      console.log("Error loading data:", error);
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

  const totalAttendance = sessions.reduce(
    (sum, s) => sum + (s.attendanceCount || 0),
    0,
  );
  const activeSessions = sessions.filter((s) => {
    if (!s.isActive) return false;
    if (new Date() > new Date(s.expiresAt)) return false;
    return true;
  }).length;

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
              👨‍🏫 {user?.fullName?.split(" ")[0] || "Lecturer"}
            </Text>
            <Text style={styles.subGreeting}>
              {user?.department || "ABU Zaria"}
            </Text>
          </View>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statIcon}>📅</Text>
            <Text style={styles.statValue}>{sessions.length}</Text>
            <Text style={styles.statLabel}>Total Sessions</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statIcon}>✅</Text>
            <Text style={styles.statValue}>{activeSessions}</Text>
            <Text style={styles.statLabel}>Active Now</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statIcon}>👥</Text>
            <Text style={styles.statValue}>{totalAttendance}</Text>
            <Text style={styles.statLabel}>Total Attendance</Text>
          </View>
        </View>

        {/* Generate QR Button */}
        <TouchableOpacity
          style={styles.generateBtn}
          onPress={() => router.push("/screens/generateQR")}
        >
          <Text style={styles.generateBtnIcon}>📲</Text>
          <View style={styles.generateBtnText}>
            <Text style={styles.generateBtnTitle}>Generate QR Code</Text>
            <Text style={styles.generateBtnSub}>
              Start a new attendance session
            </Text>
          </View>
          <Text style={styles.generateBtnArrow}>›</Text>
        </TouchableOpacity>

        {/* Recent Sessions */}
        <Text style={styles.sectionTitle}>Recent Sessions</Text>

        {loading ? (
          <ActivityIndicator
            color="#fff"
            size="large"
            style={{ marginTop: 20 }}
          />
        ) : sessions.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyText}>No sessions yet</Text>
            <Text style={styles.emptySubtext}>
              Generate a QR code to start your first session
            </Text>
          </View>
        ) : (
          sessions.map((session) => {
            const isExpired = new Date() > new Date(session.expiresAt);
            const isActive = session.isActive && !isExpired;
            return (
              <TouchableOpacity
                key={session.id}
                style={styles.sessionCard}
                onPress={() =>
                  router.push({
                    pathname: "/screens/attendanceRecords",
                    params: {
                      sessionId: session.id,
                      courseTitle: session.courseTitle,
                    },
                  })
                }
              >
                <View style={styles.sessionCardLeft}>
                  <Text style={styles.sessionCourse}>
                    {session.courseTitle}
                  </Text>
                  <Text style={styles.sessionCode}>{session.courseCode}</Text>
                  <Text style={styles.sessionDate}>
                    {formatDate(session.createdAt)}
                  </Text>
                </View>
                <View style={styles.sessionCardRight}>
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: isActive ? "#27ae60" : "#95a5a6" },
                    ]}
                  >
                    <Text style={styles.statusText}>
                      {isActive
                        ? "🟢 Active"
                        : isExpired
                          ? "⏱️ Expired"
                          : "⚫ Ended"}
                    </Text>
                  </View>
                  <Text style={styles.attendanceCount}>
                    👥 {session.attendanceCount || 0}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })
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
  subGreeting: { fontSize: 13, color: "#fff", opacity: 0.85 },
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
  generateBtn: {
    backgroundColor: "#fff",
    borderRadius: 15,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 25,
    elevation: 4,
  },
  generateBtnIcon: { fontSize: 35, marginRight: 15 },
  generateBtnText: { flex: 1 },
  generateBtnTitle: { fontSize: 17, fontWeight: "bold", color: "#1a73e8" },
  generateBtnSub: { fontSize: 12, color: "#888", marginTop: 2 },
  generateBtnArrow: { fontSize: 28, color: "#1a73e8" },
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
  sessionCard: {
    backgroundColor: "#fff",
    borderRadius: 15,
    padding: 15,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sessionCardLeft: { flex: 1 },
  sessionCourse: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 3,
  },
  sessionCode: { fontSize: 13, color: "#1a73e8", marginBottom: 3 },
  sessionDate: { fontSize: 12, color: "#888" },
  sessionCardRight: { alignItems: "flex-end" },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    marginBottom: 6,
  },
  statusText: { color: "#fff", fontSize: 11, fontWeight: "bold" },
  attendanceCount: { fontSize: 13, color: "#555" },
});
