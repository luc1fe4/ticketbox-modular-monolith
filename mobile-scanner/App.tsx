import NetInfo from '@react-native-community/netinfo';
import { useEffect, useState } from 'react';

import {
  ApiClientError,
  getAccessToken,
  getCheckinHistory,
  getOrCreateDeviceId,
  getStaffConcertOverview,
  getStaffConcerts,
  getStaffTickets,
  getStaffUser,
  loginStaff,
  logoutStaff,
} from './src/api';
import type {
  ServerCheckinHistory,
  StaffConcert,
  StaffConcertOverview,
  StaffTicket,
  StaffUser,
} from './src/api';
import {
  cacheStaffConcerts,
  getDatasetInfo,
  getMetadata,
  listCachedConcerts,
  listLocalCheckinLogs,
  listLocalTickets,
  setMetadata,
} from './src/database';
import type {
  DatasetInfo,
  LocalCheckinLog,
  LocalTicketListItem,
  LogStatusCounts,
} from './src/database';
import {
  EMPTY_LOG_COUNTERS,
  loadCheckinCounters,
  performManualOfflineCheckin,
  performOnlineCheckin,
} from './src/features/checkin';
import type { ManualCheckinResult } from './src/features/checkin';
import { downloadCheckinDataset, syncPendingLogs } from './src/features/sync';
import type { PendingSyncSummary } from './src/features/sync';
import {
  BootScreen,
  ConcertDataScreen,
  ConcertListScreen,
  ConcertOverviewScreen,
  ScannerHomeScreen,
  StaffLoginScreen,
} from './src/screens';

type Session = { accessToken: string; user: StaffUser };
type AppScreen = 'concerts' | 'overview' | 'scanner' | 'data';

const SELECTED_CONCERT_KEY = 'scanner:selectedConcertId';
const SELECTED_GATE_KEY = 'scanner:selectedGate';

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [isBooting, setIsBooting] = useState(true);
  const [isOnline, setIsOnline] = useState(false);
  const [wasOffline, setWasOffline] = useState(false);
  const [deviceId, setDeviceId] = useState('');
  const [screen, setScreen] = useState<AppScreen>('concerts');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  const [concerts, setConcerts] = useState<StaffConcert[]>([]);
  const [selectedConcert, setSelectedConcert] = useState<StaffConcert | null>(null);
  const [overview, setOverview] = useState<StaffConcertOverview | null>(null);
  const [datasetInfo, setDatasetInfo] = useState<Record<string, DatasetInfo>>({});
  const [gate, setGate] = useState('');
  const [isLoadingConcerts, setIsLoadingConcerts] = useState(false);
  const [concertError, setConcertError] = useState<string | null>(null);

  const [qrCode, setQrCode] = useState('');
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [checkinResult, setCheckinResult] = useState<ManualCheckinResult | null>(null);
  const [counters, setCounters] = useState<LogStatusCounts>(EMPTY_LOG_COUNTERS);

  const [isDownloading, setIsDownloading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncSummary, setSyncSummary] = useState<PendingSyncSummary | null>(null);
  const [operationError, setOperationError] = useState<string | null>(null);

  const [localTickets, setLocalTickets] = useState<LocalTicketListItem[]>([]);
  const [serverTickets, setServerTickets] = useState<StaffTicket[]>([]);
  const [localLogs, setLocalLogs] = useState<LocalCheckinLog[]>([]);
  const [serverHistory, setServerHistory] = useState<ServerCheckinHistory[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [dataError, setDataError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function restore() {
      try {
        const [token, user, restoredDeviceId, cachedConcerts, selectedId, savedGate] =
          await Promise.all([
            getAccessToken(),
            getStaffUser(),
            getOrCreateDeviceId(),
            listCachedConcerts(),
            getMetadata(SELECTED_CONCERT_KEY),
            getMetadata(SELECTED_GATE_KEY),
          ]);
        if (!mounted) return;
        setDeviceId(restoredDeviceId);
        setConcerts(cachedConcerts);
        setGate(savedGate ?? '');
        if (token && user?.role === 'STAFF') {
          setSession({ accessToken: token, user });
          const restoredConcert = cachedConcerts.find((concert) => concert.id === selectedId);
          if (restoredConcert) {
            setSelectedConcert(restoredConcert);
            setScreen('overview');
          }
        } else if (token || user) {
          await logoutStaff();
        }
      } finally {
        if (mounted) setIsBooting(false);
      }
    }
    restore();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    return NetInfo.addEventListener((state) => {
      const online = Boolean(state.isConnected && state.isInternetReachable !== false);
      setIsOnline(online);
      setWasOffline((previous) => {
        if (!online) return true;
        if (previous && selectedConcert && session && !isSyncing) {
          handleSync();
        }
        return false;
      });
    });
  }, [isSyncing, selectedConcert, session]);

  useEffect(() => {
    if (!session) return;
    loadConcerts();
  }, [session, isOnline]);

  useEffect(() => {
    if (!selectedConcert) return;
    refreshSelectedConcert();
  }, [selectedConcert?.id, isOnline]);

  useEffect(() => {
    if (screen === 'data' && selectedConcert) {
      loadConcertData();
    }
  }, [screen, selectedConcert?.id, isOnline]);

  async function handleLogin() {
    if (!email.trim() || !password) {
      setLoginError('Nhập email và mật khẩu STAFF.');
      return;
    }
    setIsSubmitting(true);
    setLoginError(null);
    try {
      const response = await loginStaff(email.trim(), password);
      setSession({ accessToken: response.accessToken, user: response.user });
      setPassword('');
      setScreen('concerts');
    } catch (error) {
      setLoginError(toErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleLogout() {
    await logoutStaff();
    setSession(null);
    setSelectedConcert(null);
    setOverview(null);
    setScreen('concerts');
    setPassword('');
    setCheckinResult(null);
  }

  async function loadConcerts() {
    if (!session) return;
    setIsLoadingConcerts(true);
    setConcertError(null);
    try {
      const cached = await listCachedConcerts();
      if (cached.length) {
        setConcerts(cached);
        await loadDatasetInfo(cached);
      }
      if (isOnline) {
        const page = await getStaffConcerts(session.accessToken);
        await cacheStaffConcerts(page.content);
        setConcerts(page.content);
        await loadDatasetInfo(page.content);
      }
    } catch (error) {
      setConcertError(toErrorMessage(error));
    } finally {
      setIsLoadingConcerts(false);
    }
  }

  async function loadDatasetInfo(items: StaffConcert[]) {
    const entries = await Promise.all(
      items.map(async (concert) => [concert.id, await getDatasetInfo(concert.id)] as const),
    );
    setDatasetInfo(Object.fromEntries(entries));
  }

  async function handleSelectConcert(concert: StaffConcert) {
    setSelectedConcert(concert);
    setOverview(null);
    setOperationError(null);
    setCheckinResult(null);
    setScreen('overview');
    await setMetadata(SELECTED_CONCERT_KEY, concert.id);
  }

  async function refreshSelectedConcert() {
    if (!selectedConcert || !session) return;
    const [info, nextCounters] = await Promise.all([
      getDatasetInfo(selectedConcert.id),
      loadCheckinCounters(selectedConcert.id),
    ]);
    setDatasetInfo((current) => ({ ...current, [selectedConcert.id]: info }));
    setCounters(nextCounters);
    if (isOnline) {
      try {
        setOverview(await getStaffConcertOverview(selectedConcert.id, session.accessToken));
      } catch (error) {
        setOperationError(toErrorMessage(error));
      }
    }
  }

  async function handleGateChange(value: string) {
    setGate(value);
    await setMetadata(SELECTED_GATE_KEY, value);
  }

  async function handleDownloadDataset() {
    if (!selectedConcert || !session) return;
    setIsDownloading(true);
    setOperationError(null);
    try {
      await downloadCheckinDataset({
        concertId: selectedConcert.id,
        gate,
        accessToken: session.accessToken,
      });
      await refreshSelectedConcert();
    } catch (error) {
      setOperationError(toErrorMessage(error));
    } finally {
      setIsDownloading(false);
    }
  }

  async function runCheckin(value: string) {
    if (!selectedConcert || !session) return;
    setIsCheckingIn(true);
    try {
      const outcome = isOnline
        ? await performOnlineCheckin({
            concertId: selectedConcert.id,
            qrCode: value,
            gate,
            deviceId,
            accessToken: session.accessToken,
          })
        : await performManualOfflineCheckin({
            concertId: selectedConcert.id,
            qrCode: value,
            gate,
          });
      setCheckinResult(outcome.result);
      if (outcome.inserted || outcome.result.status === 'ONLINE_ACCEPTED') {
        setQrCode('');
        setCounters(await loadCheckinCounters(selectedConcert.id));
      }
    } catch (error) {
      setCheckinResult({
        status: isOnline ? 'ONLINE_FAILED' : 'INVALID_LOCAL',
        message: toErrorMessage(error),
        qrCode: value.trim(),
      });
    } finally {
      setIsCheckingIn(false);
    }
  }

  async function handleSync() {
    if (!selectedConcert || !session || isSyncing) return;
    setIsSyncing(true);
    setOperationError(null);
    try {
      setSyncSummary(
        await syncPendingLogs({
          concertId: selectedConcert.id,
          deviceId,
          accessToken: session.accessToken,
        }),
      );
      setCounters(await loadCheckinCounters(selectedConcert.id));
    } catch (error) {
      setOperationError(toErrorMessage(error));
    } finally {
      setIsSyncing(false);
    }
  }

  async function loadConcertData() {
    if (!selectedConcert || !session) return;
    setIsLoadingData(true);
    setDataError(null);
    try {
      const [tickets, logs] = await Promise.all([
        listLocalTickets(selectedConcert.id),
        listLocalCheckinLogs(selectedConcert.id),
      ]);
      setLocalTickets(tickets);
      setLocalLogs(logs);
      if (isOnline) {
        const [ticketPage, historyPage] = await Promise.all([
          getStaffTickets(selectedConcert.id, { size: 100 }, session.accessToken),
          getCheckinHistory(selectedConcert.id, { size: 100 }, session.accessToken),
        ]);
        setServerTickets(ticketPage.content);
        setServerHistory(historyPage.content);
      }
    } catch (error) {
      setDataError(toErrorMessage(error));
    } finally {
      setIsLoadingData(false);
    }
  }

  function navigateWithinConcert(next: 'overview' | 'scanner' | 'data') {
    setScreen(next);
  }

  if (isBooting) return <BootScreen />;

  if (!session) {
    return (
      <StaffLoginScreen
        email={email}
        password={password}
        errorMessage={loginError}
        isSubmitting={isSubmitting}
        onChangeEmail={setEmail}
        onChangePassword={setPassword}
        onSubmit={handleLogin}
      />
    );
  }

  if (screen === 'concerts' || !selectedConcert) {
    return (
      <ConcertListScreen
        user={session.user}
        concerts={concerts}
        datasetInfo={datasetInfo}
        isLoading={isLoadingConcerts}
        isOnline={isOnline}
        errorMessage={concertError}
        onRefresh={loadConcerts}
        onSelectConcert={handleSelectConcert}
        onLogout={handleLogout}
      />
    );
  }

  const selectedDataset = datasetInfo[selectedConcert.id] ?? { downloadedAt: null, totalCount: 0 };

  if (screen === 'scanner') {
    return (
      <ScannerHomeScreen
        concert={selectedConcert}
        gate={gate}
        qrCode={qrCode}
        counters={counters}
        isOnline={isOnline}
        hasDataset={Boolean(selectedDataset.downloadedAt)}
        isCheckingIn={isCheckingIn}
        result={checkinResult}
        onChangeQrCode={setQrCode}
        onCheckin={() => runCheckin(qrCode)}
        onCameraQrScanned={runCheckin}
        onNavigate={navigateWithinConcert}
      />
    );
  }

  if (screen === 'data') {
    return (
      <ConcertDataScreen
        concert={selectedConcert}
        localTickets={localTickets}
        serverTickets={serverTickets}
        localLogs={localLogs}
        serverHistory={serverHistory}
        isOnline={isOnline}
        isLoading={isLoadingData}
        errorMessage={dataError}
        onRefresh={loadConcertData}
        onNavigate={navigateWithinConcert}
      />
    );
  }

  return (
    <ConcertOverviewScreen
      concert={selectedConcert}
      overview={overview}
      datasetInfo={selectedDataset}
      counters={counters}
      gate={gate}
      isOnline={isOnline}
      isLoading={false}
      isDownloading={isDownloading}
      isSyncing={isSyncing}
      errorMessage={operationError}
      syncSummary={syncSummary}
      onChangeGate={handleGateChange}
      onBack={() => setScreen('concerts')}
      onDownloadDataset={handleDownloadDataset}
      onSync={handleSync}
      onNavigate={navigateWithinConcert}
    />
  );
}

function toErrorMessage(error: unknown) {
  if (error instanceof ApiClientError || error instanceof Error) return error.message;
  return 'Có lỗi xảy ra. Vui lòng thử lại.';
}
