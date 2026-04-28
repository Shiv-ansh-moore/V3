import * as Clipboard from "expo-clipboard";
import { useState } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Colours } from "../../constants/Colours";
import { Fonts } from "../../constants/Fonts";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../lib/AuthContext";

const friendlyJoinError = (msg: string) => {
  const m = msg.toLowerCase();
  if (m.includes("invalid invite code"))
    return "That invite code doesn't match a group.";
  if (m.includes("already in a group")) return "You're already in a group.";
  if (m.includes("group is full")) return "That group is full.";
  return msg;
};

const friendlyCreateError = (msg: string) => {
  const m = msg.toLowerCase();
  if (
    m.includes("already in a group") ||
    m.includes("group_members_one_per_user")
  )
    return "You're already in a group.";
  return msg;
};

type Pending = "join" | "create" | null;

export default function JoinGroup() {
  const { refreshGroup } = useAuth();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [pending, setPending] = useState<Pending>(null);
  const [createdInviteCode, setCreatedInviteCode] = useState<string | null>(
    null,
  );
  const [copied, setCopied] = useState(false);

  const normalised = code.trim().toUpperCase();
  const canJoin = normalised.length > 0 && !loading;
  const canCreate = !loading;

  const doJoin = async () => {
    setError(null);
    setLoading(true);
    const { error: rpcError } = await supabase.rpc("join_group", {
      p_invite_code: normalised,
    });
    if (rpcError) {
      setLoading(false);
      setError(friendlyJoinError(rpcError.message));
      return;
    }
    await refreshGroup();
    setLoading(false);
    // Gate redirects to (app).
  };

  const doCreate = async () => {
    setError(null);
    setLoading(true);
    const { data, error: rpcError } = await supabase.rpc("create_group");
    if (rpcError) {
      setLoading(false);
      setError(friendlyCreateError(rpcError.message));
      return;
    }
    const row = Array.isArray(data) ? data[0] : data;
    const inviteCode: string | undefined = row?.invite_code;
    setLoading(false);
    if (!inviteCode) {
      setError("Group created, but no invite code was returned.");
      return;
    }
    setCopied(false);
    setCreatedInviteCode(inviteCode);
  };

  const copyInviteCode = async () => {
    if (!createdInviteCode) return;
    await Clipboard.setStringAsync(createdInviteCode);
    setCopied(true);
  };

  const continueAfterCreate = async () => {
    setCreatedInviteCode(null);
    setCopied(false);
    await refreshGroup();
    // Gate redirects to (app).
  };

  const askJoin = () => {
    Keyboard.dismiss();
    setPending("join");
  };

  const askCreate = () => {
    Keyboard.dismiss();
    setPending("create");
  };

  const cancelConfirm = () => setPending(null);

  const confirm = () => {
    const action = pending;
    setPending(null);
    if (action === "join") doJoin();
    else if (action === "create") doCreate();
  };

  const confirmCopy =
    pending === "join"
      ? {
          title: "Join this group?",
          body: `You'll join the group with invite code ${normalised}.`,
          cta: "Join",
        }
      : pending === "create"
        ? {
            title: "Create a new group?",
            body: "You'll be the first member. Share the invite code with friends to add them.",
            cta: "Create",
          }
        : null;

  return (
    <SafeAreaView style={styles.container}>
      <Pressable style={styles.flex} onPress={Keyboard.dismiss}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={styles.content}>
            <Text style={styles.title}>Join your group</Text>
            <Text style={styles.subtitle}>
              Enter an invite code from a friend, or start a new group.
            </Text>

            <View style={styles.form}>
              <TextInput
                style={styles.input}
                placeholder="Invite code"
                placeholderTextColor={Colours.secondaryText}
                autoCapitalize="characters"
                autoCorrect={false}
                value={code}
                onChangeText={setCode}
                maxLength={10}
              />

              {error && <Text style={styles.error}>{error}</Text>}

              <TouchableOpacity
                style={[
                  styles.button,
                  !canJoin && { backgroundColor: Colours.fadedBrand },
                ]}
                disabled={!canJoin}
                onPress={askJoin}
              >
                <Text style={styles.buttonText}>
                  {loading ? "Working…" : "Join group"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.secondaryButton,
                  !canCreate && { borderColor: Colours.fadedBrand },
                ]}
                disabled={!canCreate}
                onPress={askCreate}
              >
                <Text
                  style={[
                    styles.secondaryButtonText,
                    !canCreate && { color: Colours.fadedBrand },
                  ]}
                >
                  Create group
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Pressable>

      <Modal
        visible={confirmCopy !== null}
        transparent
        animationType="fade"
        onRequestClose={cancelConfirm}
      >
        <Pressable style={styles.confirmBackdrop} onPress={cancelConfirm}>
          <Pressable style={styles.confirmCard}>
            {confirmCopy && (
              <>
                <Text style={styles.confirmTitle}>{confirmCopy.title}</Text>
                <Text style={styles.confirmBody}>{confirmCopy.body}</Text>
                <View style={styles.confirmActions}>
                  <TouchableOpacity
                    style={styles.confirmCancel}
                    onPress={cancelConfirm}
                  >
                    <Text style={styles.confirmCancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.confirmPrimary}
                    onPress={confirm}
                  >
                    <Text style={styles.confirmPrimaryText}>
                      {confirmCopy.cta}
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={createdInviteCode !== null}
        transparent
        animationType="fade"
        onRequestClose={continueAfterCreate}
      >
        <View style={styles.confirmBackdrop}>
          <View style={styles.confirmCard}>
            <Text style={styles.confirmTitle}>Group created</Text>
            <Text style={styles.confirmBody}>
              Share this code with friends so they can join your group.
            </Text>
            <View style={styles.codeBox}>
              <Text style={styles.codeText}>{createdInviteCode}</Text>
            </View>
            <View style={styles.confirmActions}>
              <TouchableOpacity
                style={styles.confirmCancel}
                onPress={copyInviteCode}
              >
                <Text style={styles.confirmCancelText}>
                  {copied ? "Copied" : "Copy code"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmPrimary}
                onPress={continueAfterCreate}
              >
                <Text style={styles.confirmPrimaryText}>Continue</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colours.background,
  },
  flex: { flex: 1 },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 64,
  },
  title: {
    fontFamily: Fonts.bold,
    fontSize: 28,
    color: Colours.text,
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: Fonts.regular,
    fontSize: 15,
    color: Colours.secondaryText,
    marginBottom: 32,
  },
  form: {
    gap: 12,
  },
  input: {
    backgroundColor: Colours.card,
    borderWidth: 1,
    borderColor: "#222",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontFamily: Fonts.regular,
    fontSize: 16,
    color: Colours.text,
    letterSpacing: 2,
  },
  error: {
    fontFamily: Fonts.medium,
    fontSize: 14,
    color: "#FF5A5A",
    marginTop: 4,
  },
  button: {
    backgroundColor: Colours.brand,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 8,
  },
  buttonText: {
    fontFamily: Fonts.semiBold,
    fontSize: 16,
    color: Colours.text,
  },
  secondaryButton: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: Colours.brand,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 4,
  },
  secondaryButtonText: {
    fontFamily: Fonts.semiBold,
    fontSize: 16,
    color: Colours.brand,
  },
  confirmBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  confirmCard: {
    width: "100%",
    backgroundColor: Colours.card,
    borderWidth: 1,
    borderColor: "#222",
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 16,
  },
  confirmTitle: {
    fontFamily: Fonts.semiBold,
    fontSize: 17,
    color: Colours.text,
    marginBottom: 8,
  },
  confirmBody: {
    fontFamily: Fonts.regular,
    fontSize: 14,
    lineHeight: 20,
    color: Colours.secondaryText,
    marginBottom: 20,
  },
  codeBox: {
    backgroundColor: Colours.background,
    borderWidth: 1,
    borderColor: "#222",
    borderRadius: 12,
    paddingVertical: 18,
    alignItems: "center",
    marginBottom: 20,
  },
  codeText: {
    fontFamily: Fonts.bold,
    fontSize: 26,
    color: Colours.brand,
    letterSpacing: 4,
  },
  confirmActions: {
    flexDirection: "row",
    gap: 10,
  },
  confirmCancel: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: Colours.cardHighlight,
    alignItems: "center",
  },
  confirmCancelText: {
    fontFamily: Fonts.semiBold,
    fontSize: 15,
    color: Colours.text,
  },
  confirmPrimary: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: Colours.brand,
    alignItems: "center",
  },
  confirmPrimaryText: {
    fontFamily: Fonts.semiBold,
    fontSize: 15,
    color: Colours.text,
  },
});
