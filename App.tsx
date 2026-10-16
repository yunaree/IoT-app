import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, StatusBar, ActivityIndicator, ScrollView } from 'react-native';
import { Accelerometer } from 'expo-sensors';
import { MockBleScanner, MockCargoDevice, BleDevice } from './BleMock';

interface SensorCoords {
  x: number;
  y: number;
  z: number;
}

// Стани кінцевого автомата (State Machine)
type BleState = 'DISCONNECTED' | 'SCANNING' | 'FOUND' | 'CONNECTING' | 'CONNECTED';

export default function App() {
  // --- Логіка Л.Р. 1 (Сенсори) ---
  const [data, setData] = useState<SensorCoords>({ x: 0, y: 0, z: 0 });
  
  useEffect(() => {
    Accelerometer.setUpdateInterval(100);
    const subscription = Accelerometer.addListener(setData);
    return () => subscription.remove();
  }, []);

  const totalG = Math.sqrt(data.x ** 2 + data.y ** 2 + data.z ** 2);
  const isImpact = totalG > 2.0;

  // --- Логіка Л.Р. 2 (BLE Mock) ---
  const [bleState, setBleState] = useState<BleState>('DISCONNECTED');
  const [foundDevices, setFoundDevices] = useState<BleDevice[]>([]);
  const [activeDevice, setActiveDevice] = useState<MockCargoDevice | null>(null);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (msg: string) => {
    setLogs(prev => [msg, ...prev].slice(0, 5)); // Зберігаємо останні 5 логів
    console.log(msg); // Лог у термінал VS Code (імітація Logcat)
  };

  const startScan = async () => {
    setBleState('SCANNING');
    setFoundDevices([]);
    addLog('[SCAN] Пошук BLE маяків...');
    
    const devices = await MockBleScanner.scanForDevices();
    setFoundDevices(devices);
    setBleState('FOUND');
    addLog(`[SCAN] Знайдено: ${devices[0].name}`);
  };

  const connectToDevice = async (device: BleDevice) => {
    setBleState('CONNECTING');
    addLog(`[CONN] Підключення до ${device.id}...`);
    
    const cargoDevice = new MockCargoDevice(device);
    const success = await cargoDevice.connect();
    
    if (success) {
      setActiveDevice(cargoDevice);
      setBleState('CONNECTED');
      addLog(`[CONN] Успішно підключено!`);
    }
  };

  const sendCommand = async () => {
    if (activeDevice && activeDevice.isConnected) {
      const packet = JSON.stringify({ cmd: 'STATUS_UPDATE', impact: isImpact });
      addLog(`[TX] Відправка: ${packet}`);
      await activeDevice.sendData(packet);
      addLog(`[RX] Успішно отримано маяком`);
    }
  };

  const disconnect = () => {
    if (activeDevice) {
      activeDevice.disconnect();
      setActiveDevice(null);
      setBleState('DISCONNECTED');
      addLog('[DISC] Відключено');
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingVertical: 40 }}>
      <StatusBar barStyle="light-content" />
      <Text style={styles.appTitle}>Impact Logger</Text>
      
      {/* Міні-віджет сенсора з Л.Р.1 */}
      <View style={styles.card}>
        <Text style={styles.sectionHeader}>G-Force Сенсор:</Text>
        <Text style={[styles.mainGValue, { color: isImpact ? '#ef4444' : '#10b981' }]}>
          {totalG.toFixed(2)} G
        </Text>
      </View>

      {/* BLE Модуль */}
      <View style={styles.card}>
        <Text style={styles.sectionHeader}>BLE Інтерфейс (Л.Р. 2)</Text>
        <Text style={styles.statusText}>Статус: <Text style={{fontWeight: 'bold'}}>{bleState}</Text></Text>

        {bleState === 'DISCONNECTED' && (
          <TouchableOpacity style={styles.btnBlue} onPress={startScan}>
            <Text style={styles.btnText}>Пошук пристроїв</Text>
          </TouchableOpacity>
        )}

        {bleState === 'SCANNING' && (
          <ActivityIndicator size="large" color="#3b82f6" style={{ marginVertical: 10 }} />
        )}

        {bleState === 'FOUND' && foundDevices.map((dev, idx) => (
          <TouchableOpacity key={idx} style={styles.deviceItem} onPress={() => connectToDevice(dev)}>
            <Text style={styles.devName}>{dev.name}</Text>
            <Text style={styles.devId}>{dev.id} | RSSI: {dev.rssi}dBm</Text>
          </TouchableOpacity>
        ))}

        {bleState === 'CONNECTING' && (
          <Text style={{color: '#f59e0b', textAlign: 'center', marginVertical: 10}}>Встановлення зв'язку...</Text>
        )}

        {bleState === 'CONNECTED' && (
          <View>
            <TouchableOpacity style={styles.btnGreen} onPress={sendCommand}>
              <Text style={styles.btnText}>Відправити дані сенсора</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.btnRed} onPress={disconnect}>
              <Text style={styles.btnText}>Відключити</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Термінал (Імітація Logcat) */}
      <View style={styles.terminal}>
        <Text style={styles.termTitle}>Термінал (Logcat)</Text>
        {logs.map((log, i) => (
          <Text key={i} style={styles.termText}>{log}</Text>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a', paddingHorizontal: 20 },
  appTitle: { fontSize: 24, fontWeight: 'bold', color: '#f8fafc', textAlign: 'center', marginBottom: 20 },
  card: { backgroundColor: '#1e293b', borderRadius: 12, padding: 18, marginBottom: 16, borderWidth: 1, borderColor: '#334155' },
  sectionHeader: { fontSize: 16, fontWeight: '600', color: '#cbd5e1', marginBottom: 10 },
  mainGValue: { fontSize: 32, fontWeight: '800', textAlign: 'center' },
  statusText: { color: '#94a3b8', fontSize: 14, marginBottom: 10 },
  btnBlue: { backgroundColor: '#2563eb', padding: 12, borderRadius: 8, alignItems: 'center' },
  btnGreen: { backgroundColor: '#10b981', padding: 12, borderRadius: 8, alignItems: 'center', marginBottom: 8 },
  btnRed: { backgroundColor: '#ef4444', padding: 12, borderRadius: 8, alignItems: 'center' },
  btnText: { color: 'white', fontWeight: 'bold' },
  deviceItem: { backgroundColor: '#334155', padding: 12, borderRadius: 8, marginVertical: 5 },
  devName: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  devId: { color: '#94a3b8', fontSize: 12 },
  terminal: { backgroundColor: '#000', padding: 10, borderRadius: 8, minHeight: 120 },
  termTitle: { color: '#22c55e', fontWeight: 'bold', marginBottom: 5 },
  termText: { color: '#22c55e', fontFamily: 'monospace', fontSize: 11, marginVertical: 2 }
});