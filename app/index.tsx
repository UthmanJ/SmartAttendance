import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import { ActivityIndicator, Image, StyleSheet, Text, View } from "react-native";
import { auth, db } from "../constants/firebase";

export default function SplashScreen() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, "users", user.uid));
          if (userDoc.exists()) {
            const role = userDoc.data().role;
            if (role === "lecturer") {
              router.replace("/screens/lecturerDashboard");
            } else {
              router.replace("/screens/studentDashboard");
            }
          } else {
            router.replace("/screens/login");
          }
        } catch (error) {
          router.replace("/screens/login");
        }
      } else {
        setTimeout(() => {
          router.replace("/screens/login");
        }, 2500);
      }
      setChecking(false);
    });
    return () => unsubscribe();
  }, []);

  return (
    <LinearGradient colors={["#1a73e8", "#0d47a1"]} style={styles.container}>
      {/* ABU Logo */}
      <View style={styles.logoContainer}>
        <Image
          source={require("../assets/abu-logo.png")}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>

      <Text style={styles.title}>SmartAttend</Text>
      <Text style={styles.university}>Ahmadu Bello University, Zaria</Text>
      <Text style={styles.subtitle}>Smart Attendance System</Text>
      <Text style={styles.department}>Dept. of Computer Science</Text>

      {checking && (
        <ActivityIndicator
          size="large"
          color="#fff"
          style={{ marginTop: 30 }}
        />
      )}

      <Text style={styles.powered}>Powered by BeeWave Tech Solutions</Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 30,
  },
  logoContainer: {
    backgroundColor: "#fff",
    borderRadius: 75,
    width: 130,
    height: 130,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
  },
  logo: { width: 100, height: 100 },
  title: { fontSize: 30, fontWeight: "bold", color: "#fff", marginBottom: 4 },
  university: {
    fontSize: 15,
    color: "#fff",
    fontWeight: "600",
    marginBottom: 3,
    textAlign: "center",
  },
  subtitle: { fontSize: 13, color: "#fff", opacity: 0.9, marginBottom: 3 },
  department: { fontSize: 12, color: "#fff", opacity: 0.8 },
  powered: {
    position: "absolute",
    bottom: 40,
    fontSize: 12,
    color: "#fff",
    opacity: 0.7,
  },
});
