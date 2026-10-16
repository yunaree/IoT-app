export interface BleDevice {
  id: string;
  name: string;
  rssi: number;
}

export interface IBleConnector {
  connect(): Promise<boolean>;
  disconnect(): void;
  sendData(data: string): Promise<boolean>;
}

export class MockBleScanner {
  static scanForDevices(): Promise<BleDevice[]> {
    console.log('[BLE_SCAN] Сканування ефіру...');
    return new Promise((resolve) => {
      // Імітуємо пошук протягом 2 секунд
      setTimeout(() => {
        console.log('[BLE_SCAN] Знайдено пристрої');
        resolve([
          { id: 'DD:EE:AA:BB:CC:11', name: 'Cargo-Sensor-Beacon', rssi: -45 }
        ]);
      }, 2000);
    });
  }
}

export class MockCargoDevice implements IBleConnector {
  device: BleDevice;
  isConnected: boolean = false;

  constructor(device: BleDevice) {
    this.device = device;
  }

  connect(): Promise<boolean> {
    console.log(`[BLE_CONNECT] З'єднання з ${this.device.id}...`);
    return new Promise((resolve) => {
      setTimeout(() => {
        this.isConnected = true;
        console.log(`[BLE_CONNECT] Успішно підключено до ${this.device.name}`);
        resolve(true);
      }, 1500); // Імітація часу на handshake
    });
  }

  disconnect(): void {
    this.isConnected = false;
    console.log(`[BLE_DISCONNECT] Відключено від ${this.device.name}`);
  }

  sendData(data: string): Promise<boolean> {
    console.log(`[BLE_TX] Відправка пакету: ${data}`);
    return new Promise((resolve) => {
      setTimeout(() => {
        console.log(`[BLE_ACK] Пакет доставлено на характеристику 0000ffe2`);
        resolve(true);
      }, 500);
    });
  }
}