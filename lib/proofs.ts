import { File } from "expo-file-system";
import { supabase } from "./supabase";

export type ProofSubmissionTarget =
  | {
      kind: "existing";
      goalId: string;
    }
  | {
      kind: "quick";
      title: string;
      icon: string;
    };

interface SubmitProofArgs {
  userId: string;
  photoUri: string;
  caption?: string;
  target: ProofSubmissionTarget;
}

async function softDeleteCreatedGoal(goalId: string, userId: string) {
  const { error } = await supabase
    .from("goals")
    .update({
      status: "deleted",
      deleted_at: new Date().toISOString(),
    })
    .eq("id", goalId)
    .eq("user_id", userId);

  if (error) {
    console.log("[proofs] cleanup quick goal failed:", error.message);
  }
}

async function removeUploadedProof(path: string) {
  const { error } = await supabase.storage.from("proofs").remove([path]);

  if (error) {
    console.log("[proofs] cleanup uploaded image failed:", error.message);
  }
}

export async function submitProof({
  userId,
  photoUri,
  caption,
  target,
}: SubmitProofArgs) {
  let createdGoalId: string | null = null;
  let imagePath: string | null = null;

  try {
    let goalId: string;

    if (target.kind === "quick") {
      const { data, error } = await supabase
        .from("goals")
        .insert({
          user_id: userId,
          title: target.title,
          icon: target.icon,
          status: "active",
        })
        .select("id")
        .single();

      if (error) throw error;
      if (!data?.id) throw new Error("Quick proof goal was not created.");

      createdGoalId = data.id;
      goalId = data.id;
    } else {
      goalId = target.goalId;
    }

    const arrayBuffer = await new File(photoUri).arrayBuffer();
    const path = `${userId}/${goalId}-${Date.now()}.jpg`;

    const { error: uploadError } = await supabase.storage
      .from("proofs")
      .upload(path, arrayBuffer, { contentType: "image/jpeg" });

    if (uploadError) throw uploadError;
    imagePath = path;

    const trimmedCaption = caption?.trim() ?? "";
    const { error: insertError } = await supabase.from("proofs").insert({
      goal_id: goalId,
      user_id: userId,
      image_path: path,
      ...(trimmedCaption ? { caption: trimmedCaption } : {}),
    });

    if (insertError) throw insertError;
  } catch (error) {
    if (imagePath) {
      await removeUploadedProof(imagePath);
    }

    if (createdGoalId) {
      await softDeleteCreatedGoal(createdGoalId, userId);
    }

    throw error;
  }
}
