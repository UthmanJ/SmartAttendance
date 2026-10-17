import { LinearGradient } from "expo-linear-gradient";
import * as Print from "expo-print";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Sharing from "expo-sharing";
import { collection, getDocs, orderBy, query, where } from "firebase/firestore";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { db } from "../../constants/firebase";

export default function AttendanceRecordsScreen() {
  const router = useRouter();
  const { sessionId, courseTitle } = useLocalSearchParams();
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    loadRecords();
  }, []);

  const loadRecords = async () => {
    setLoading(true);
    try {
      const q = query(
        collection(db, "attendance"),
        where("sessionId", "==", sessionId),
        orderBy("markedAt", "asc"),
      );
      const snapshot = await getDocs(q);
      setRecords(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (error) {
      console.log("Error:", error);
    }
    setLoading(false);
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadRecords();
    setRefreshing(false);
  }, []);

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const exportToPDF = async () => {
    if (records.length === 0) {
      Alert.alert("No Records", "There are no attendance records to export.");
      return;
    }

    setExporting(true);
    try {
      const sessionDate = records[0]?.markedAt
        ? formatDate(records[0].markedAt)
        : new Date().toLocaleDateString("en-GB", {
            day: "numeric",
            month: "long",
            year: "numeric",
          });

      // Build student rows HTML
      const rows = records
        .map(
          (record, index) => `
        <tr style="background-color: ${index % 2 === 0 ? "#f8f9ff" : "#ffffff"};">
          <td style="padding: 10px; text-align: center; border: 1px solid #ddd;">${index + 1}</td>
          <td style="padding: 10px; border: 1px solid #ddd;">${record.studentName || "N/A"}</td>
          <td style="padding: 10px; text-align: center; border: 1px solid #ddd;">${record.matricNumber || "N/A"}</td>
          <td style="padding: 10px; border: 1px solid #ddd;">${record.department || "N/A"}</td>
          <td style="padding: 10px; text-align: center; border: 1px solid #ddd;">${formatTime(record.markedAt)}</td>
          <td style="padding: 10px; text-align: center; border: 1px solid #ddd; color: #27ae60; font-weight: bold;">✓ Present</td>
        </tr>
      `,
        )
        .join("");

      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8" />
            <style>
              * { margin: 0; padding: 0; box-sizing: border-box; }
              body { font-family: Arial, sans-serif; color: #333; padding: 20px; }
              .header { text-align: center; margin-bottom: 25px; border-bottom: 3px solid #1a73e8; padding-bottom: 15px; }
              .uni-name { font-size: 18px; font-weight: bold; color: #1a73e8; margin-bottom: 3px; }
              .dept-name { font-size: 13px; color: #555; margin-bottom: 3px; }
              .system-name { font-size: 14px; font-weight: bold; color: #333; margin-top: 5px; }
              .info-section { display: flex; justify-content: space-between; margin-bottom: 20px; background: #f0f4ff; padding: 15px; border-radius: 8px; border-left: 4px solid #1a73e8; }
              .info-block { flex: 1; }
              .info-label { font-size: 11px; color: #888; text-transform: uppercase; margin-bottom: 3px; }
              .info-value { font-size: 14px; font-weight: bold; color: #333; }
              .summary { display: flex; gap: 15px; margin-bottom: 20px; }
              .summary-card { flex: 1; background: #1a73e8; color: white; padding: 12px; border-radius: 8px; text-align: center; }
              .summary-number { font-size: 24px; font-weight: bold; }
              .summary-label { font-size: 11px; opacity: 0.9; margin-top: 3px; }
              table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
              thead { background-color: #1a73e8; color: white; }
              thead th { padding: 12px 10px; text-align: left; font-size: 13px; border: 1px solid #1565c0; }
              tbody td { font-size: 13px; }
              .footer { text-align: center; font-size: 11px; color: #888; margin-top: 20px; padding-top: 15px; border-top: 1px solid #eee; }
              .signature-section { display: flex; justify-content: space-between; margin-top: 40px; }
              .signature-box { text-align: center; width: 200px; }
              .signature-line { border-top: 1px solid #333; padding-top: 5px; font-size: 12px; color: #555; }
            </style>
          </head>
          <body>
            <!-- Header -->
            <div class="header">
              <div class="uni-name">AHMADU BELLO UNIVERSITY, ZARIA</div>
              <div class="dept-name">Department of Computer Science · Faculty of Physical Sciences</div>
              <div class="system-name">SMARTATTEND — ATTENDANCE RECORD</div>
            </div>

            <!-- Course Info -->
            <div class="info-section">
              <div class="info-block">
                <div class="info-label">Course Title</div>
                <div class="info-value">${courseTitle || "N/A"}</div>
              </div>
              <div class="info-block">
                <div class="info-label">Course Code</div>
                <div class="info-value">${records[0]?.courseCode || "N/A"}</div>
              </div>
              <div class="info-block">
                <div class="info-label">Date</div>
                <div class="info-value">${sessionDate}</div>
              </div>
            </div>

            <!-- Summary Cards -->
            <div class="summary">
              <div class="summary-card">
                <div class="summary-number">${records.length}</div>
                <div class="summary-label">Students Present</div>
              </div>
              <div class="summary-card" style="background: #27ae60;">
                <div class="summary-number">100%</div>
                <div class="summary-label">Attendance Rate</div>
              </div>
              <div class="summary-card" style="background: #f39c12;">
                <div class="summary-number">${formatTime(records[0]?.markedAt || "")}</div>
                <div class="summary-label">Session Started</div>
              </div>
              <div class="summary-card" style="background: #8e44ad;">
                <div class="summary-number">${formatTime(records[records.length - 1]?.markedAt || "")}</div>
                <div class="summary-label">Last Check-in</div>
              </div>
            </div>

            <!-- Attendance Table -->
            <table>
              <thead>
                <tr>
                  <th style="width: 40px;">#</th>
                  <th>Full Name</th>
                  <th>Matric Number</th>
                  <th>Department</th>
                  <th>Time</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                ${rows}
              </tbody>
            </table>

            <!-- Signature Section -->
            <div class="signature-section">
              <div class="signature-box">
                <div class="signature-line">Lecturer's Signature</div>
              </div>
              <div class="signature-box">
                <div class="signature-line">Date</div>
              </div>
              <div class="signature-box">
                <div class="signature-line">HOD's Signature</div>
              </div>
            </div>

            <!-- Footer -->
            <div class="footer">
              Generated by SmartAttend · Powered by BeeWave Tech Solutions · ${new Date().toLocaleString("en-GB")}
            </div>
          </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({
        html,
        base64: false,
      });

      await Sharing.shareAsync(uri, {
        mimeType: "application/pdf",
        dialogTitle: `Attendance — ${courseTitle}`,
        UTI: "com.adobe.pdf",
      });
    } catch (error) {
      Alert.alert("Export Failed", "Could not generate PDF. Please try again.");
    }
    setExporting(false);
  };

  return (
    <LinearGradient colors={["#1a73e8", "#0d47a1"]} style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          👥 Attendance
        </Text>
        <TouchableOpacity
          style={styles.exportBtn}
          onPress={exportToPDF}
          disabled={exporting}
        >
          {exporting ? (
            <ActivityIndicator color="#1a73e8" size="small" />
          ) : (
            <Text style={styles.exportBtnText}>📄 PDF</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Course Info */}
      <View style={styles.courseInfo}>
        <Text style={styles.courseTitle}>{courseTitle}</Text>
        <Text style={styles.studentCount}>
          {records.length} student{records.length !== 1 ? "s" : ""} present
        </Text>
      </View>

      {loading ? (
        <ActivityIndicator
          size="large"
          color="#fff"
          style={{ marginTop: 50 }}
        />
      ) : (
        <FlatList
          data={records}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#fff"
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyCard}>
              <Text style={styles.emptyIcon}>👥</Text>
              <Text style={styles.emptyText}>No students yet</Text>
              <Text style={styles.emptySubtext}>
                Waiting for students to scan the QR code
              </Text>
            </View>
          }
          renderItem={({ item, index }) => (
            <View style={styles.recordCard}>
              <View style={styles.recordNumber}>
                <Text style={styles.recordNumberText}>{index + 1}</Text>
              </View>
              <View style={styles.recordInfo}>
                <Text style={styles.recordName}>{item.studentName}</Text>
                <Text style={styles.recordMatric}>{item.matricNumber}</Text>
                <Text style={styles.recordDept}>{item.department}</Text>
              </View>
              <View style={styles.recordRight}>
                <Text style={styles.recordTime}>
                  {formatTime(item.markedAt)}
                </Text>
                {item.testingMode ? (
                  <Text style={styles.testingBadge}>🔓 Test</Text>
                ) : (
                  <Text style={styles.recordDistance}>📍 {item.distance}m</Text>
                )}
                <Text style={styles.presentBadge}>✅ Present</Text>
              </View>
            </View>
          )}
        />
      )}
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
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
    flex: 1,
    textAlign: "center",
  },
  exportBtn: {
    backgroundColor: "#fff",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 60,
    alignItems: "center",
  },
  exportBtnText: { color: "#1a73e8", fontWeight: "bold", fontSize: 13 },
  courseInfo: { alignItems: "center", paddingHorizontal: 20, marginBottom: 15 },
  courseTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#fff",
    textAlign: "center",
    marginBottom: 4,
  },
  studentCount: { fontSize: 14, color: "#fff", opacity: 0.85 },
  listContent: { paddingHorizontal: 20, paddingBottom: 40 },
  emptyCard: {
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 15,
    padding: 40,
    alignItems: "center",
    marginTop: 20,
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
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
  },
  recordNumber: {
    backgroundColor: "#e8f0fe",
    width: 35,
    height: 35,
    borderRadius: 17,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  recordNumberText: { fontSize: 14, fontWeight: "bold", color: "#1a73e8" },
  recordInfo: { flex: 1 },
  recordName: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 2,
  },
  recordMatric: { fontSize: 12, color: "#1a73e8", marginBottom: 1 },
  recordDept: { fontSize: 11, color: "#888" },
  recordRight: { alignItems: "flex-end" },
  recordTime: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 2,
  },
  recordDistance: { fontSize: 11, color: "#888", marginBottom: 3 },
  testingBadge: { fontSize: 11, color: "#e53935", marginBottom: 3 },
  presentBadge: { fontSize: 11, color: "#27ae60", fontWeight: "bold" },
});
