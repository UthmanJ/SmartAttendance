import { Stack } from "expo-router";

export default function RootLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="screens/login" />
      <Stack.Screen name="screens/register" />
      <Stack.Screen name="screens/lecturerDashboard" />
      <Stack.Screen name="screens/studentDashboard" />
      <Stack.Screen name="screens/generateQR" />
      <Stack.Screen name="screens/scanQR" />
      <Stack.Screen name="screens/attendanceRecords" />
      <Stack.Screen name="screens/forgotPassword" />
    </Stack>
  );
}
