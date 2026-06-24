import { useState, useMemo } from 'react';
import {
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import type { StaffConcert, StaffGuestListEntry } from '../api';
import { Header, Screen, SecondaryButton } from '../ui/components';
import { colors, radius, spacing } from '../ui/theme';

type Props = {
  concert: StaffConcert;
  guestList: StaffGuestListEntry[];
  onBack: () => void;
};

export function GuestListScreen({ concert, guestList, onBack }: Props) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredGuests = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return guestList;
    return guestList.filter((guest) =>
      guest.fullName.toLowerCase().includes(query) ||
      guest.phone.includes(query)
    );
  }, [guestList, searchQuery]);

  return (
    <Screen>
      <View style={styles.topActions}>
        <SecondaryButton label="‹ Quay lại" onPress={onBack} />
      </View>
      <View style={{ paddingHorizontal: spacing.screen, paddingTop: 10 }}>
        <Header
          eyebrow="Danh sách khách mời"
          title={concert.title}
          subtitle={`Tổng cộng: ${guestList.length} khách mời`}
        />
      </View>
      
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Tìm theo tên hoặc SĐT..."
          placeholderTextColor={colors.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <FlatList
        data={filteredGuests}
        keyExtractor={(item) => item.guestId}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>Không tìm thấy khách mời nào.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.guestCard}>
            <View style={styles.guestInfo}>
              <Text style={styles.guestName}>{item.fullName}</Text>
              <Text style={styles.guestPhone}>{item.phone}</Text>
            </View>
            <View style={styles.guestMeta}>
              {item.category ? (
                <Text style={styles.categoryBadge}>{item.category}</Text>
              ) : null}
              {item.sponsorName ? (
                <Text style={styles.sponsorText}>{item.sponsorName}</Text>
              ) : null}
            </View>
          </View>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  topActions: {
    paddingHorizontal: spacing.screen,
    paddingTop: spacing.screen,
    flexDirection: 'row',
  },
  searchContainer: {
    paddingHorizontal: spacing.screen,
    paddingTop: 10,
    paddingBottom: 20,
  },
  searchInput: {
    height: 44,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.input,
    paddingHorizontal: 12,
    color: colors.text,
    backgroundColor: colors.surface,
  },
  listContent: {
    paddingHorizontal: spacing.screen,
    paddingBottom: spacing.screen,
    gap: 12,
  },
  emptyState: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 15,
  },
  guestCard: {
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  guestInfo: {
    flex: 1,
    gap: 4,
  },
  guestName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  guestPhone: {
    fontSize: 14,
    color: colors.textMuted,
  },
  guestMeta: {
    alignItems: 'flex-end',
    gap: 4,
  },
  categoryBadge: {
    backgroundColor: colors.accentSoft,
    color: colors.accent,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    fontSize: 12,
    fontWeight: '700',
    overflow: 'hidden',
  },
  sponsorText: {
    fontSize: 12,
    color: colors.textMuted,
  },
});
