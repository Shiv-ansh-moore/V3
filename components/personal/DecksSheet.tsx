import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Keyboard,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import {
  CaretLeftIcon,
  CaretRightIcon,
  PackageIcon,
  PencilSimpleIcon,
  PlusIcon,
  TrashIcon,
  XIcon,
} from "phosphor-react-native";
import { Colours } from "../../constants/Colours";
import { Fonts } from "../../constants/Fonts";
import { useAuth } from "../../lib/AuthContext";
import { supabase } from "../../lib/supabase";
import type { Database, Json } from "../../lib/database.types";
import GoalIcon from "./GoalIcon";
import { IconPickerPanel } from "./IconPickerSheet";
import { fallbackGoalIconName, getGoalIconForTitle } from "./goalIconCatalog";
import type { GoalTemplate } from "./AddGoalSheet";

type GoalDeckRow = Database["public"]["Tables"]["goal_decks"]["Row"];
type GoalDeckItemRow =
  Database["public"]["Tables"]["goal_deck_items"]["Row"];

export interface GoalDeck extends GoalDeckRow {
  items: GoalTemplate[];
}

interface EditableDeckItem extends GoalTemplate {
  localId: string;
}

type DeckEditorStep = "details" | "goals";

interface DecksSheetProps {
  visible: boolean;
  onClose: () => void;
  onUseDeck: (deck: GoalDeck) => void;
}

interface DeckEditorSheetProps {
  visible: boolean;
  deck: GoalDeck | null;
  onClose: () => void;
  onChanged: () => void;
}

function makeLocalId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function makeEditableItem(template: GoalTemplate): EditableDeckItem {
  return {
    localId: makeLocalId(),
    title: template.title,
    icon: template.icon,
  };
}

export default function DecksSheet({
  visible,
  onClose,
  onUseDeck,
}: DecksSheetProps) {
  const { user } = useAuth();
  const [decks, setDecks] = useState<GoalDeck[]>([]);
  const [loading, setLoading] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const [editingDeck, setEditingDeck] = useState<GoalDeck | null>(null);

  const loadDecks = useCallback(async () => {
    if (!user) {
      setDecks([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data: deckData, error: deckError } = await supabase
      .from("goal_decks")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (deckError) {
      console.log("[goal decks] fetch error:", deckError.message);
      Alert.alert("Could not load decks", deckError.message);
      setLoading(false);
      return;
    }

    const deckRows = deckData ?? [];
    const deckIds = deckRows.map((deck) => deck.id);
    let itemRows: GoalDeckItemRow[] = [];

    if (deckIds.length > 0) {
      const { data: itemData, error: itemError } = await supabase
        .from("goal_deck_items")
        .select("*")
        .in("deck_id", deckIds)
        .order("position", { ascending: true });

      if (itemError) {
        console.log("[goal deck items] fetch error:", itemError.message);
        Alert.alert("Could not load deck goals", itemError.message);
        setLoading(false);
        return;
      }

      itemRows = itemData ?? [];
    }

    const itemsByDeckId = new Map<string, GoalTemplate[]>();
    itemRows.forEach((item) => {
      const items = itemsByDeckId.get(item.deck_id) ?? [];
      items.push({ title: item.title, icon: item.icon });
      itemsByDeckId.set(item.deck_id, items);
    });

    setDecks(
      deckRows.map((deck) => ({
        ...deck,
        items: itemsByDeckId.get(deck.id) ?? [],
      })),
    );
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (visible) {
      loadDecks();
      return;
    }

    setShowEditor(false);
    setEditingDeck(null);
  }, [loadDecks, visible]);

  const openCreateEditor = () => {
    setEditingDeck(null);
    setShowEditor(true);
  };

  const openEditEditor = (deck: GoalDeck) => {
    setEditingDeck(deck);
    setShowEditor(true);
  };

  const handleChanged = () => {
    setShowEditor(false);
    setEditingDeck(null);
    loadDecks();
  };

  const renderDeck = ({ item }: { item: GoalDeck }) => {
    const previewItems = item.items.slice(0, 4);
    const extraCount = item.items.length - previewItems.length;

    return (
      <View style={styles.deckCard}>
        <TouchableOpacity
          style={styles.deckMain}
          activeOpacity={0.78}
          onPress={() => onUseDeck(item)}
        >
          <View style={styles.deckIconBox}>
            <GoalIcon name={item.icon} size={25} />
          </View>
          <View style={styles.deckCopy}>
            <Text style={styles.deckTitle} numberOfLines={1}>
              {item.title}
            </Text>
            <Text style={styles.deckCount}>
              {item.items.length} {item.items.length === 1 ? "goal" : "goals"}
            </Text>
          </View>
          <CaretRightIcon
            size={18}
            weight="bold"
            color={Colours.secondaryText}
          />
        </TouchableOpacity>

        <View style={styles.deckFooter}>
          <View style={styles.chipRow}>
            {previewItems.map((goal, index) => (
              <View
                key={`${item.id}-${goal.title}-${index}`}
                style={styles.goalChip}
              >
                <GoalIcon name={goal.icon} size={14} />
                <Text style={styles.goalChipText} numberOfLines={1}>
                  {goal.title}
                </Text>
              </View>
            ))}
            {extraCount > 0 && (
              <View style={styles.goalChip}>
                <Text style={styles.goalChipText}>+{extraCount}</Text>
              </View>
            )}
          </View>
          <TouchableOpacity
            style={styles.editButton}
            activeOpacity={0.75}
            onPress={() => openEditEditor(item)}
          >
            <PencilSimpleIcon
              size={15}
              weight="bold"
              color={Colours.secondaryText}
            />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <>
      <Modal
        visible={visible}
        transparent
        animationType="slide"
        onRequestClose={showEditor ? () => setShowEditor(false) : onClose}
      >
        {showEditor ? (
          <DeckEditorPanel
            visible={showEditor}
            deck={editingDeck}
            onClose={() => setShowEditor(false)}
            onChanged={handleChanged}
          />
        ) : (
          <Pressable style={styles.overlay} onPress={onClose}>
            <Pressable style={styles.sheet}>
              <View style={styles.header}>
                <View>
                  <Text style={styles.title}>Goal Decks</Text>
                  <Text style={styles.subtitle}>Create reusable goal packs</Text>
                </View>
                <TouchableOpacity
                  style={styles.closeButton}
                  activeOpacity={0.75}
                  onPress={onClose}
                >
                  <XIcon
                    size={18}
                    weight="bold"
                    color={Colours.secondaryText}
                  />
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.createCard}
                activeOpacity={0.8}
                onPress={openCreateEditor}
              >
                <View style={styles.createIconBox}>
                  <PackageIcon size={22} weight="bold" color={Colours.brand} />
                </View>
                <View style={styles.createCopy}>
                  <Text style={styles.createTitle}>Create your own deck</Text>
                  <Text style={styles.createSubtitle}>
                    Build a reusable set of goals
                  </Text>
                </View>
              </TouchableOpacity>

              <Text style={styles.sectionLabel}>YOUR DECKS</Text>

              {loading ? (
                <View style={styles.loadingState}>
                  <ActivityIndicator color={Colours.brand} />
                </View>
              ) : (
                <FlatList
                  data={decks}
                  renderItem={renderDeck}
                  keyExtractor={(item) => item.id}
                  contentContainerStyle={[
                    styles.deckList,
                    decks.length === 0 && styles.emptyList,
                  ]}
                  ListEmptyComponent={
                    <Text style={styles.emptyText}>No decks yet</Text>
                  }
                  showsVerticalScrollIndicator={false}
                />
              )}
            </Pressable>
          </Pressable>
        )}
      </Modal>
    </>
  );
}

function DeckEditorPanel({
  visible,
  deck,
  onClose,
  onChanged,
}: DeckEditorSheetProps) {
  const [title, setTitle] = useState("");
  const [icon, setIcon] = useState(fallbackGoalIconName);
  const [goalText, setGoalText] = useState("");
  const [items, setItems] = useState<EditableDeckItem[]>([]);
  const [editingIconTarget, setEditingIconTarget] = useState<string | null>(
    null,
  );
  const [step, setStep] = useState<DeckEditorStep>("details");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const goalInputRef = useRef<TextInput>(null);
  const nameInputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (!visible) return;

    setTitle(deck?.title ?? "");
    setIcon(deck?.icon ?? fallbackGoalIconName);
    setGoalText("");
    setItems((deck?.items ?? []).map(makeEditableItem));
    setEditingIconTarget(null);
    setStep("details");
  }, [deck, visible]);

  const trimmedTitle = title.trim();
  const canContinue = trimmedTitle.length > 0 && !saving && !deleting;
  const canSave =
    trimmedTitle.length > 0 && items.length > 0 && !saving && !deleting;

  const updateTitle = (value: string) => {
    setTitle(value);
    if (!deck && icon === fallbackGoalIconName) {
      setIcon(getGoalIconForTitle(value));
    }
  };

  const addGoalTemplate = () => {
    const trimmed = goalText.trim();
    if (!trimmed) return;

    setItems((current) => [
      ...current,
      {
        localId: makeLocalId(),
        title: trimmed,
        icon: getGoalIconForTitle(trimmed),
      },
    ]);
    setGoalText("");
  };

  const removeItem = (localId: string) => {
    setItems((current) => current.filter((item) => item.localId !== localId));
  };

  const saveDeck = async () => {
    if (!canSave || saving) return;

    setSaving(true);
    const { error } = await supabase.rpc("save_goal_deck", {
      p_deck_id: deck?.id ?? null,
      p_title: trimmedTitle,
      p_icon: icon,
      p_items: items.map((item) => ({
        title: item.title.trim(),
        icon: item.icon,
      })) as Json,
    });
    setSaving(false);

    if (error) {
      console.log("[goal decks] save error:", error.message);
      Alert.alert("Could not save deck", error.message);
      return;
    }

    onChanged();
  };

  const deleteDeck = async () => {
    if (!deck || deleting) return;

    setDeleting(true);
    const { error } = await supabase
      .from("goal_decks")
      .delete()
      .eq("id", deck.id);
    setDeleting(false);

    if (error) {
      console.log("[goal decks] delete error:", error.message);
      Alert.alert("Could not delete deck", error.message);
      return;
    }

    onChanged();
  };

  const confirmDelete = () => {
    if (!deck) return;

    Alert.alert(
      "Delete deck?",
      `This removes "${deck.title}" and its goal templates.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: deleteDeck,
        },
      ],
    );
  };

  const closeEditor = () => {
    if (saving || deleting) return;
    onClose();
  };

  const handleIconSelect = (iconName: string) => {
    if (editingIconTarget === "deck") {
      setIcon(iconName);
    } else if (editingIconTarget) {
      setItems((current) =>
        current.map((item) =>
          item.localId === editingIconTarget
            ? { ...item, icon: iconName }
            : item,
        ),
      );
    }

    setEditingIconTarget(null);
  };

  const saveLabel = useMemo(() => {
    if (saving) return "Saving...";
    return deck ? "Save Deck" : "Create Deck";
  }, [deck, saving]);

  const continueToGoals = () => {
    if (!canContinue) return;
    setStep("goals");
    requestAnimationFrame(() => goalInputRef.current?.focus());
  };

  const renderTemplateItem = ({ item }: { item: EditableDeckItem }) => (
    <View style={styles.pendingRow}>
      <Pressable
        style={styles.pendingIconBox}
        onPress={() => setEditingIconTarget(item.localId)}
      >
        <GoalIcon name={item.icon} size={24} />
      </Pressable>
      <Text style={styles.pendingTitle}>{item.title}</Text>
      <Pressable
        onPress={() => removeItem(item.localId)}
        style={styles.removeBtn}
      >
        <XIcon size={16} weight="bold" color={Colours.secondaryText} />
      </Pressable>
    </View>
  );

  if (editingIconTarget !== null) {
    return (
      <IconPickerPanel
        onClose={() => setEditingIconTarget(null)}
        onSelect={handleIconSelect}
      />
    );
  }

  return (
    <Pressable
      style={styles.overlay}
      onPress={() => {
        if (
          goalInputRef.current?.isFocused() ||
          nameInputRef.current?.isFocused()
        ) {
          Keyboard.dismiss();
        } else {
          closeEditor();
        }
      }}
    >
      <KeyboardAvoidingView behavior="padding">
        <Pressable style={styles.editorSheet}>
          <View style={styles.editorTitleRow}>
            <View style={styles.editorTitleGroup}>
              {step === "goals" && (
                <TouchableOpacity
                  style={styles.backButton}
                  activeOpacity={0.75}
                  onPress={() => setStep("details")}
                >
                  <CaretLeftIcon
                    size={18}
                    weight="bold"
                    color={Colours.secondaryText}
                  />
                </TouchableOpacity>
              )}
              <Text style={styles.editorTitle} numberOfLines={1}>
                {step === "details" ? "Deck Name" : "Deck Goals"}
              </Text>
            </View>
            {deck && (
              <TouchableOpacity
                style={styles.deleteDeckButton}
                activeOpacity={0.75}
                onPress={confirmDelete}
                disabled={deleting}
              >
                <TrashIcon
                  size={18}
                  weight="bold"
                  color="rgba(255,90,90,0.92)"
                />
              </TouchableOpacity>
            )}
          </View>

          {step === "details" ? (
            <>
              <View style={styles.deckNameOnlyRow}>
                <Pressable
                  style={styles.deckIconPicker}
                  onPress={() => setEditingIconTarget("deck")}
                >
                  <GoalIcon name={icon} size={28} />
                </Pressable>
                <TextInput
                  ref={nameInputRef}
                  style={styles.deckNameInput}
                  placeholder="Deck name"
                  placeholderTextColor={Colours.secondaryText}
                  value={title}
                  onChangeText={updateTitle}
                  returnKeyType="next"
                  onSubmitEditing={continueToGoals}
                />
              </View>

              <TouchableOpacity
                style={[
                  styles.saveDeckButton,
                  !canContinue && styles.disabledButton,
                ]}
                activeOpacity={0.82}
                onPress={continueToGoals}
                disabled={!canContinue}
              >
                <Text
                  style={[
                    styles.saveDeckText,
                    !canContinue && styles.disabledButtonText,
                  ]}
                >
                  Next
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <View style={styles.inputRow}>
                <TextInput
                  ref={goalInputRef}
                  style={styles.input}
                  placeholder="e.g. Gym"
                  placeholderTextColor={Colours.secondaryText}
                  value={goalText}
                  onChangeText={setGoalText}
                  onSubmitEditing={addGoalTemplate}
                  blurOnSubmit={false}
                  returnKeyType="done"
                />
              </View>

              <FlatList
                data={items}
                renderItem={renderTemplateItem}
                keyExtractor={(item) => item.localId}
                keyboardShouldPersistTaps="handled"
              />

              {items.length === 0 && (
                <Pressable
                  style={styles.addGoalBtn}
                  onPress={() => goalInputRef.current?.focus()}
                >
                  <View style={styles.addGoalCircle}>
                    <PlusIcon
                      size={20}
                      weight="bold"
                      color={Colours.fadedBrand}
                    />
                  </View>
                  <Text style={styles.editorEmptyText}>
                    Add goals to this deck
                  </Text>
                </Pressable>
              )}

              <TouchableOpacity
                style={[
                  styles.saveDeckButton,
                  !canSave && styles.disabledButton,
                ]}
                activeOpacity={0.82}
                onPress={saveDeck}
                disabled={!canSave}
              >
                <Text
                  style={[
                    styles.saveDeckText,
                    !canSave && styles.disabledButtonText,
                  ]}
                >
                  {saveLabel}
                </Text>
              </TouchableOpacity>
            </>
          )}
        </Pressable>
      </KeyboardAvoidingView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: Colours.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 34,
    maxHeight: "82%",
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingHorizontal: 19,
    paddingTop: 18,
    paddingBottom: 16,
  },
  title: {
    fontSize: 18,
    fontFamily: Fonts.bold,
    color: Colours.text,
  },
  subtitle: {
    fontSize: 13,
    fontFamily: Fonts.medium,
    color: Colours.secondaryText,
    marginTop: 4,
  },
  closeButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Colours.cardHighlight,
    alignItems: "center",
    justifyContent: "center",
  },
  createCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginHorizontal: 19,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: "#333333",
    backgroundColor: "#151515",
  },
  createIconBox: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "rgba(255,106,0,0.14)",
    alignItems: "center",
    justifyContent: "center",
  },
  createCopy: {
    flex: 1,
  },
  createTitle: {
    fontSize: 15,
    fontFamily: Fonts.bold,
    color: Colours.brand,
  },
  createSubtitle: {
    fontSize: 12,
    fontFamily: Fonts.regular,
    color: Colours.secondaryText,
    marginTop: 3,
  },
  sectionLabel: {
    fontSize: 11,
    fontFamily: Fonts.bold,
    color: Colours.secondaryText,
    letterSpacing: 0,
    marginTop: 24,
    marginBottom: 10,
    paddingHorizontal: 19,
  },
  loadingState: {
    minHeight: 150,
    alignItems: "center",
    justifyContent: "center",
  },
  deckList: {
    gap: 12,
    paddingHorizontal: 19,
    paddingBottom: 4,
  },
  emptyList: {
    minHeight: 150,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    fontSize: 13,
    fontFamily: Fonts.medium,
    color: Colours.secondaryText,
  },
  deckCard: {
    borderRadius: 12,
    backgroundColor: "#171717",
    borderWidth: 1,
    borderColor: "#222222",
    padding: 14,
  },
  deckMain: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  deckIconBox: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: Colours.cardHighlight,
    alignItems: "center",
    justifyContent: "center",
  },
  deckCopy: {
    flex: 1,
    minWidth: 0,
  },
  deckTitle: {
    fontSize: 16,
    fontFamily: Fonts.bold,
    color: Colours.text,
  },
  deckCount: {
    fontSize: 12,
    fontFamily: Fonts.medium,
    color: Colours.secondaryText,
    marginTop: 4,
  },
  deckFooter: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
    marginTop: 12,
  },
  chipRow: {
    flex: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
  },
  goalChip: {
    maxWidth: "100%",
    height: 29,
    borderRadius: 7,
    backgroundColor: Colours.cardHighlight,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 9,
  },
  goalChipText: {
    flexShrink: 1,
    fontSize: 12,
    fontFamily: Fonts.medium,
    color: Colours.secondaryText,
  },
  editButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: Colours.cardHighlight,
    alignItems: "center",
    justifyContent: "center",
  },
  editorSheet: {
    backgroundColor: Colours.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 34,
  },
  editorTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 19,
    paddingTop: 16,
    paddingBottom: 14,
  },
  editorTitleGroup: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  backButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: Colours.cardHighlight,
    alignItems: "center",
    justifyContent: "center",
  },
  editorTitle: {
    flexShrink: 1,
    fontSize: 16,
    fontFamily: Fonts.bold,
    color: Colours.text,
  },
  deleteDeckButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255,90,90,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  deckNameOnlyRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 19,
    paddingBottom: 24,
    gap: 10,
  },
  deckIconPicker: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: Colours.cardHighlight,
    alignItems: "center",
    justifyContent: "center",
  },
  deckNameInput: {
    flex: 1,
    height: 52,
    borderRadius: 12,
    backgroundColor: Colours.cardHighlight,
    paddingHorizontal: 14,
    fontSize: 15,
    fontFamily: Fonts.regular,
    color: Colours.text,
  },
  inputRow: {
    paddingHorizontal: 19,
    paddingBottom: 16,
  },
  input: {
    width: "100%",
    height: 44,
    backgroundColor: Colours.cardHighlight,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 15,
    fontFamily: Fonts.regular,
    color: Colours.text,
  },
  pendingRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 19,
    marginBottom: 14,
    gap: 12,
  },
  pendingIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: Colours.cardHighlight,
    alignItems: "center",
    justifyContent: "center",
  },
  pendingTitle: {
    flex: 1,
    fontFamily: Fonts.medium,
    fontSize: 14,
    color: Colours.text,
  },
  removeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colours.cardHighlight,
    alignItems: "center",
    justifyContent: "center",
  },
  addGoalBtn: {
    paddingVertical: 24,
    alignItems: "center",
    gap: 8,
  },
  addGoalCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: Colours.fadedBrand,
    alignItems: "center",
    justifyContent: "center",
  },
  editorEmptyText: {
    fontSize: 12,
    fontFamily: Fonts.regular,
    color: "#555",
  },
  saveDeckButton: {
    height: 48,
    borderRadius: 14,
    marginHorizontal: 19,
    backgroundColor: Colours.brand,
    alignItems: "center",
    justifyContent: "center",
  },
  saveDeckText: {
    fontSize: 16,
    fontFamily: Fonts.semiBold,
    color: Colours.text,
  },
  disabledButton: {
    backgroundColor: Colours.cardHighlight,
  },
  disabledButtonText: {
    color: Colours.secondaryText,
  },
});
