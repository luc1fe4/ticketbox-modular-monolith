import { useEffect, useState } from 'react';
import NetInfo from '@react-native-community/netinfo';

import {
  ApiClientError,
  getAccessToken,
  getOrCreateDeviceId,
  getStaffUser,
  loginStaff,
  logoutStaff,
} from './src/api';
import type { StaffUser } from './src/api';
import {
  EMPTY_LOG_COUNTERS,
  loadCheckinCounters,
  performManualOfflineCheckin,
  performOnlineCheckin,
} from './src/features/checkin';
import type { ManualCheckinResult } from './src/features/checkin';
import { downloadCheckinDataset, syncPendingLogs } from './src/features/sync';
import type { DatasetDownloadSummary, PendingSyncSummary } from './src/features/sync';
import type { LogStatusCounts } from './src/database';
import { BootScreen, ScannerHomeScreen, StaffLoginScreen } from './src/screens';

type Session = {
  accessToken: string;
  user: StaffUser;
};

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isBooting, setIsBooting] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [concertId, setConcertId] = useState('');
  const [gate, setGate] = useState('');
  const [isDownloadingDataset, setIsDownloadingDataset] = useState(false);
  const [datasetErrorMessage, setDatasetErrorMessage] = useState<string | null>(null);
  const [downloadSummary, setDownloadSummary] = useState<DatasetDownloadSummary | null>(null);
  const [qrCode, setQrCode] = useState('');
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [manualCheckinResult, setManualCheckinResult] = useState<ManualCheckinResult | null>(null);
  const [logCounters, setLogCounters] = useState<LogStatusCounts>(EMPTY_LOG_COUNTERS);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncErrorMessage, setSyncErrorMessage] = useState<string | null>(null);
  const [syncSummary, setSyncSummary] = useState<PendingSyncSummary | null>(null);
  const [isOnline, setIsOnline] = useState(false);
  const [wasOffline, setWasOffline] = useState(false);
  const [deviceId, setDeviceId] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function restoreSession() {
      try {
        const [storedToken, storedUser, restoredDeviceId] = await Promise.all([
          getAccessToken(),
          getStaffUser(),
          getOrCreateDeviceId(),
        ]);

        if (!isMounted) {
          return;
        }

        setDeviceId(restoredDeviceId);
        if (storedToken && storedUser?.role === 'STAFF') {
          setSession({ accessToken: storedToken, user: storedUser });
        } else if (storedToken || storedUser) {
          await logoutStaff();
        }
      } finally {
        if (isMounted) {
          setIsBooting(false);
        }
      }
    }

    restoreSession();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const nextIsOnline = Boolean(state.isConnected && state.isInternetReachable !== false);

      setIsOnline(nextIsOnline);
      setWasOffline((previousWasOffline) => {
        if (!nextIsOnline) {
          return true;
        }

        if (previousWasOffline && session && concertId.trim() && !isSyncing) {
          handleSyncPendingLogs();
        }

        return false;
      });
    });

    return unsubscribe;
  }, [concertId, isSyncing, session]);

  async function handleLogin() {
    const trimmedEmail = email.trim();

    if (!trimmedEmail || !password) {
      setErrorMessage('Enter STAFF email and password.');
      return;
    }

    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const response = await loginStaff(trimmedEmail, password);
      setSession({ accessToken: response.accessToken, user: response.user });
      setPassword('');
    } catch (error) {
      setErrorMessage(toLoginErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleLogout() {
    await logoutStaff();
    setSession(null);
    setPassword('');
    setConcertId('');
    setGate('');
    setDatasetErrorMessage(null);
    setDownloadSummary(null);
    setQrCode('');
    setManualCheckinResult(null);
    setLogCounters(EMPTY_LOG_COUNTERS);
    setSyncErrorMessage(null);
    setSyncSummary(null);
  }

  async function handleDownloadDataset() {
    setDatasetErrorMessage(null);
    setIsDownloadingDataset(true);

    try {
      const summary = await downloadCheckinDataset({
        concertId,
        gate,
        accessToken: session?.accessToken,
      });

      setConcertId(summary.concertId);
      await refreshLogCounters(summary.concertId);
      setDownloadSummary(summary);
    } catch (error) {
      setDatasetErrorMessage(toLoginErrorMessage(error));
    } finally {
      setIsDownloadingDataset(false);
    }
  }

  async function handleManualCheckin() {
    await runCheckin(qrCode);
  }

  async function handleCameraQrScanned(scannedQrCode: string) {
    setQrCode(scannedQrCode);
    await runCheckin(scannedQrCode);
  }

  async function runCheckin(checkinQrCode: string) {
    setIsCheckingIn(true);

    try {
      const outcome = isOnline
        ? await performOnlineCheckin({
            concertId,
            qrCode: checkinQrCode,
            gate,
            deviceId: deviceId ?? '',
            accessToken: session?.accessToken,
          })
        : await performManualOfflineCheckin({ concertId, qrCode: checkinQrCode, gate });

      setManualCheckinResult(outcome.result);
      if (outcome.inserted || outcome.result.status === 'ONLINE_ACCEPTED') {
        setQrCode('');
        await refreshLogCounters(concertId);
      }
    } catch (error) {
      setManualCheckinResult({
        status: 'INVALID_LOCAL',
        message: toLoginErrorMessage(error),
        qrCode: checkinQrCode.trim(),
      });
    } finally {
      setIsCheckingIn(false);
    }
  }

  async function handleSyncPendingLogs() {
    if (isSyncing) {
      return;
    }

    setSyncErrorMessage(null);
    setIsSyncing(true);

    try {
      const summary = await syncPendingLogs({
        concertId,
        deviceId: deviceId ?? '',
        accessToken: session?.accessToken,
      });

      setSyncSummary(summary);
      await refreshLogCounters(concertId);
    } catch (error) {
      setSyncErrorMessage(toLoginErrorMessage(error));
    } finally {
      setIsSyncing(false);
    }
  }

  async function refreshLogCounters(selectedConcertId: string) {
    setLogCounters(await loadCheckinCounters(selectedConcertId));
  }

  if (isBooting) {
    return <BootScreen />;
  }

  if (session) {
    return (
      <ScannerHomeScreen
        concertId={concertId}
        counters={logCounters}
        downloadSummary={downloadSummary}
        errorMessage={datasetErrorMessage}
        gate={gate}
        isCheckingIn={isCheckingIn}
        isDownloading={isDownloadingDataset}
        isSyncing={isSyncing}
        isOnline={isOnline}
        manualCheckinResult={manualCheckinResult}
        onChangeConcertId={setConcertId}
        onChangeGate={setGate}
        onChangeQrCode={setQrCode}
        onCameraQrScanned={handleCameraQrScanned}
        onDownloadDataset={handleDownloadDataset}
        onManualCheckin={handleManualCheckin}
        onLogout={handleLogout}
        onSyncPendingLogs={handleSyncPendingLogs}
        qrCode={qrCode}
        syncErrorMessage={syncErrorMessage}
        syncSummary={syncSummary}
        user={session.user}
      />
    );
  }

  return (
    <StaffLoginScreen
      email={email}
      errorMessage={errorMessage}
      isSubmitting={isSubmitting}
      onChangeEmail={setEmail}
      onChangePassword={setPassword}
      onSubmit={handleLogin}
      password={password}
    />
  );
}

function toLoginErrorMessage(error: unknown) {
  if (error instanceof ApiClientError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Unable to sign in. Check the network and try again.';
}
