import {
  CameraView,
  useCameraPermissions,
  type BarcodeScanningResult,
} from 'expo-camera';
import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import type { StaffUser } from '../api';
import type { LogStatusCounts } from '../database';
import type { ManualCheckinResult } from '../features/checkin';
import type { DatasetDownloadSummary, PendingSyncSummary } from '../features/sync';

type ScannerHomeScreenProps = {
  user: StaffUser;
  concertId: string;
  gate: string;
  qrCode: string;
  counters: LogStatusCounts;
  downloadSummary: DatasetDownloadSummary | null;
  errorMessage: string | null;
  manualCheckinResult: ManualCheckinResult | null;
  syncErrorMessage: string | null;
  syncSummary: PendingSyncSummary | null;
  isDownloading: boolean;
  isCheckingIn: boolean;
  isSyncing: boolean;
  isOnline: boolean;
  onChangeConcertId: (concertId: string) => void;
  onChangeGate: (gate: string) => void;
  onChangeQrCode: (qrCode: string) => void;
  onDownloadDataset: () => void;
  onManualCheckin: () => void;
  onCameraQrScanned: (qrCode: string) => void;
  onSyncPendingLogs: () => void;
  onLogout: () => void;
};

export function ScannerHomeScreen({
  user,
  concertId,
  gate,
  qrCode,
  counters,
  downloadSummary,
  errorMessage,
  manualCheckinResult,
  syncErrorMessage,
  syncSummary,
  isDownloading,
  isCheckingIn,
  isSyncing,
  isOnline,
  onChangeConcertId,
  onChangeGate,
  onChangeQrCode,
  onDownloadDataset,
  onManualCheckin,
  onCameraQrScanned,
  onSyncPendingLogs,
  onLogout,
}: ScannerHomeScreenProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [isCameraActive, setIsCameraActive] = useState(false);
  const lastScanRef = useRef<{ qrCode: string; scannedAt: number } | null>(null);
  const isBusy = isDownloading || isCheckingIn || isSyncing;
  const hasCameraPermission = permission?.granted === true;

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.kicker}>TicketBox Scanner</Text>
          <Text style={styles.title}>Check-in dataset</Text>
          <Text style={styles.copy}>Signed in as {user.fullName}</Text>
          <View style={[styles.networkBadge, isOnline ? styles.onlineBadge : styles.offlineBadge]}>
            <Text style={styles.networkBadgeText}>{isOnline ? 'Online' : 'Offline'}</Text>
          </View>
        </View>

        <View style={styles.panel}>
          <View style={styles.field}>
            <Text style={styles.label}>Concert ID</Text>
            <TextInput
              autoCapitalize="none"
              editable={!isBusy}
              onChangeText={onChangeConcertId}
              placeholder="Paste concert UUID"
              placeholderTextColor="#7a8991"
              style={styles.input}
              value={concertId}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Gate</Text>
            <TextInput
              autoCapitalize="characters"
              editable={!isBusy}
              onChangeText={onChangeGate}
              placeholder="A, B, VIP..."
              placeholderTextColor="#7a8991"
              style={styles.input}
              value={gate}
            />
          </View>

          {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

          <Pressable
            disabled={isDownloading}
            onPress={onDownloadDataset}
            style={({ pressed }) => [
              styles.primaryButton,
              (pressed || isDownloading) && styles.primaryButtonPressed,
            ]}
          >
            {isDownloading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.primaryButtonText}>Download Dataset</Text>
            )}
          </Pressable>
        </View>

        {downloadSummary ? (
          <View style={styles.summaryPanel}>
            <Text style={styles.summaryTitle}>Dataset saved locally</Text>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Concert</Text>
              <Text style={styles.summaryValue}>{downloadSummary.concertId}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Gate</Text>
              <Text style={styles.summaryValue}>{downloadSummary.gate || 'Not set'}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Tickets</Text>
              <Text style={styles.summaryValue}>{downloadSummary.totalCount}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Generated</Text>
              <Text style={styles.summaryValue}>{formatDateTime(downloadSummary.generatedAt)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Downloaded</Text>
              <Text style={styles.summaryValue}>{formatDateTime(downloadSummary.downloadedAt)}</Text>
            </View>
          </View>
        ) : null}

        <View style={styles.panel}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>QR check-in</Text>
            <Pressable
              disabled={isBusy}
              onPress={() => setIsCameraActive((current) => !current)}
              style={({ pressed }) => [
                styles.modeButton,
                isCameraActive && styles.modeButtonActive,
                (pressed || isBusy) && styles.primaryButtonPressed,
              ]}
            >
              <Text style={[styles.modeButtonText, isCameraActive && styles.modeButtonTextActive]}>
                {isCameraActive ? 'Manual' : 'Camera'}
              </Text>
            </Pressable>
          </View>
          <Text style={styles.helperText}>
            {isOnline
              ? 'Online mode: QR submissions are checked by the server immediately.'
              : 'Offline mode: QR submissions are validated locally and saved as pending sync.'}
          </Text>

          {isCameraActive ? (
            <View style={styles.cameraPanel}>
              {!permission ? (
                <View style={styles.cameraFallback}>
                  <ActivityIndicator color="#287565" />
                  <Text style={styles.helperText}>Checking camera permission...</Text>
                </View>
              ) : null}

              {permission && !hasCameraPermission ? (
                <View style={styles.cameraFallback}>
                  <Text style={styles.helperText}>Camera permission is required to scan QR codes.</Text>
                  <Pressable
                    disabled={isBusy}
                    onPress={requestPermission}
                    style={({ pressed }) => [
                      styles.secondaryButton,
                      (pressed || isBusy) && styles.primaryButtonPressed,
                    ]}
                  >
                    <Text style={styles.secondaryButtonText}>Allow Camera</Text>
                  </Pressable>
                </View>
              ) : null}

              {hasCameraPermission ? (
                <CameraView
                  barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                  onBarcodeScanned={isBusy ? undefined : handleBarcodeScanned}
                  style={styles.cameraView}
                >
                  <View style={styles.scanFrame} />
                </CameraView>
              ) : null}
            </View>
          ) : null}

          <View style={styles.field}>
            <Text style={styles.label}>QR code</Text>
            <TextInput
              autoCapitalize="none"
              editable={!isBusy}
              multiline
              onChangeText={onChangeQrCode}
              placeholder="Paste QR payload"
              placeholderTextColor="#7a8991"
              style={[styles.input, styles.qrInput]}
              value={qrCode}
            />
          </View>

          <Pressable
            disabled={isBusy}
            onPress={onManualCheckin}
            style={({ pressed }) => [
              styles.primaryButton,
              (pressed || isBusy) && styles.primaryButtonPressed,
            ]}
          >
            {isCheckingIn ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.primaryButtonText}>
                {isOnline ? 'Check In Online' : 'Check In Offline'}
              </Text>
            )}
          </Pressable>

          {manualCheckinResult ? (
            <View style={[styles.resultBox, getResultStyle(manualCheckinResult.status)]}>
              <Text style={styles.resultStatus}>{manualCheckinResult.status}</Text>
              <Text style={styles.resultText}>{manualCheckinResult.message}</Text>
              {manualCheckinResult.checkedAt ? (
                <Text style={styles.resultText}>
                  Checked at {formatDateTime(manualCheckinResult.checkedAt)}
                </Text>
              ) : null}
            </View>
          ) : null}
        </View>

        <View style={styles.counterPanel}>
          <View style={styles.counterItem}>
            <Text style={styles.counterValue}>{counters.PENDING}</Text>
            <Text style={styles.counterLabel}>Pending</Text>
          </View>
          <View style={styles.counterItem}>
            <Text style={styles.counterValue}>{counters.SYNCED}</Text>
            <Text style={styles.counterLabel}>Synced</Text>
          </View>
          <View style={styles.counterItem}>
            <Text style={styles.counterValue}>{counters.FAILED + counters.CONFLICT}</Text>
            <Text style={styles.counterLabel}>Failed/Conflict</Text>
          </View>
        </View>

        <View style={styles.panel}>
          <Text style={styles.sectionTitle}>Batch sync</Text>
          <Pressable
            disabled={isBusy}
            onPress={onSyncPendingLogs}
            style={({ pressed }) => [
              styles.primaryButton,
              (pressed || isBusy) && styles.primaryButtonPressed,
            ]}
          >
            {isSyncing ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.primaryButtonText}>Sync Now</Text>
            )}
          </Pressable>

          {syncErrorMessage ? <Text style={styles.errorText}>{syncErrorMessage}</Text> : null}

          {syncSummary ? (
            <View style={styles.syncSummaryGrid}>
              <View style={styles.syncSummaryItem}>
                <Text style={styles.syncSummaryValue}>{syncSummary.accepted}</Text>
                <Text style={styles.syncSummaryLabel}>Accepted</Text>
              </View>
              <View style={styles.syncSummaryItem}>
                <Text style={styles.syncSummaryValue}>{syncSummary.skipped}</Text>
                <Text style={styles.syncSummaryLabel}>Skipped</Text>
              </View>
              <View style={styles.syncSummaryItem}>
                <Text style={styles.syncSummaryValue}>{syncSummary.invalid}</Text>
                <Text style={styles.syncSummaryLabel}>Invalid</Text>
              </View>
            </View>
          ) : null}
        </View>

        <Pressable style={styles.secondaryButton} onPress={onLogout}>
          <Text style={styles.secondaryButtonText}>Sign out</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );

  function handleBarcodeScanned(result: BarcodeScanningResult) {
    const scannedQrCode = result.data.trim();
    const now = Date.now();
    const previousScan = lastScanRef.current;

    if (!scannedQrCode) {
      return;
    }

    if (previousScan?.qrCode === scannedQrCode && now - previousScan.scannedAt < 3000) {
      return;
    }

    lastScanRef.current = {
      qrCode: scannedQrCode,
      scannedAt: now,
    };
    onChangeQrCode(scannedQrCode);
    onCameraQrScanned(scannedQrCode);
  }
}

function getResultStyle(status: ManualCheckinResult['status']) {
  if (status === 'PENDING') {
    return styles.resultSuccess;
  }

  if (status === 'DUPLICATE_LOCAL') {
    return styles.resultWarning;
  }

  return styles.resultError;
}

function formatDateTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#eef4f2',
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    gap: 18,
    padding: 20,
  },
  header: {
    gap: 8,
  },
  kicker: {
    color: '#287565',
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  title: {
    color: '#162126',
    fontSize: 30,
    fontWeight: '800',
  },
  copy: {
    color: '#52636b',
    fontSize: 16,
    lineHeight: 23,
  },
  networkBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  onlineBadge: {
    backgroundColor: '#dff5ed',
  },
  offlineBadge: {
    backgroundColor: '#fff0dc',
  },
  networkBadgeText: {
    color: '#162126',
    fontSize: 13,
    fontWeight: '800',
  },
  panel: {
    gap: 16,
    padding: 18,
    borderRadius: 8,
    backgroundColor: '#ffffff',
    borderColor: '#d7e3df',
    borderWidth: 1,
  },
  field: {
    gap: 8,
  },
  label: {
    color: '#26343a',
    fontSize: 14,
    fontWeight: '700',
  },
  input: {
    minHeight: 50,
    borderRadius: 8,
    borderColor: '#b9c8c3',
    borderWidth: 1,
    color: '#162126',
    fontSize: 16,
    paddingHorizontal: 14,
    backgroundColor: '#f9fbfa',
  },
  errorText: {
    color: '#b42318',
    fontSize: 14,
    lineHeight: 20,
  },
  primaryButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
    borderRadius: 8,
    backgroundColor: '#287565',
  },
  primaryButtonPressed: {
    opacity: 0.78,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
  },
  sectionTitle: {
    color: '#162126',
    fontSize: 17,
    fontWeight: '800',
  },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  modeButton: {
    minHeight: 36,
    justifyContent: 'center',
    borderRadius: 8,
    borderColor: '#287565',
    borderWidth: 1,
    paddingHorizontal: 12,
  },
  modeButtonActive: {
    backgroundColor: '#287565',
  },
  modeButtonText: {
    color: '#287565',
    fontSize: 14,
    fontWeight: '800',
  },
  modeButtonTextActive: {
    color: '#ffffff',
  },
  helperText: {
    color: '#52636b',
    fontSize: 14,
    lineHeight: 20,
  },
  cameraPanel: {
    minHeight: 260,
    overflow: 'hidden',
    borderRadius: 8,
    backgroundColor: '#162126',
  },
  cameraView: {
    minHeight: 260,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraFallback: {
    minHeight: 260,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 16,
    backgroundColor: '#f9fbfa',
  },
  scanFrame: {
    width: 190,
    height: 190,
    borderRadius: 8,
    borderColor: '#ffffff',
    borderWidth: 3,
    backgroundColor: 'transparent',
  },
  qrInput: {
    minHeight: 84,
    paddingTop: 12,
    textAlignVertical: 'top',
  },
  resultBox: {
    gap: 4,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  resultSuccess: {
    backgroundColor: '#edf8f4',
    borderColor: '#86c8b7',
  },
  resultWarning: {
    backgroundColor: '#fff8e8',
    borderColor: '#e8c66d',
  },
  resultError: {
    backgroundColor: '#fff1f0',
    borderColor: '#eba19a',
  },
  resultStatus: {
    color: '#162126',
    fontSize: 14,
    fontWeight: '800',
  },
  resultText: {
    color: '#52636b',
    fontSize: 14,
    lineHeight: 20,
  },
  counterPanel: {
    flexDirection: 'row',
    gap: 10,
  },
  counterItem: {
    flex: 1,
    gap: 4,
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#ffffff',
    borderColor: '#d7e3df',
    borderWidth: 1,
  },
  counterValue: {
    color: '#162126',
    fontSize: 22,
    fontWeight: '800',
  },
  counterLabel: {
    color: '#52636b',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  syncSummaryGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  syncSummaryItem: {
    flex: 1,
    gap: 4,
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#f9fbfa',
    borderColor: '#d7e3df',
    borderWidth: 1,
  },
  syncSummaryValue: {
    color: '#162126',
    fontSize: 20,
    fontWeight: '800',
  },
  syncSummaryLabel: {
    color: '#52636b',
    fontSize: 12,
    fontWeight: '700',
  },
  summaryPanel: {
    gap: 10,
    padding: 18,
    borderRadius: 8,
    backgroundColor: '#ffffff',
    borderColor: '#d7e3df',
    borderWidth: 1,
  },
  summaryTitle: {
    color: '#287565',
    fontSize: 15,
    fontWeight: '800',
  },
  summaryRow: {
    gap: 3,
  },
  summaryLabel: {
    color: '#52636b',
    fontSize: 13,
    fontWeight: '700',
  },
  summaryValue: {
    color: '#162126',
    fontSize: 14,
    lineHeight: 20,
  },
  secondaryButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    borderRadius: 8,
    borderColor: '#287565',
    borderWidth: 1,
  },
  secondaryButtonText: {
    color: '#287565',
    fontSize: 16,
    fontWeight: '800',
  },
});
