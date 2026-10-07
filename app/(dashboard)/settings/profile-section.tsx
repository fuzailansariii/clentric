import { notFound } from "next/navigation";
import { getProfileSettings } from "./queries";
import { ProfileForm } from "./profile-form";

export async function ProfileSection() {
  const profile = await getProfileSettings();

  // requireUser() has already run, so a missing row means the profile was
  // never created rather than that nobody is signed in.
  if (!profile) {
    notFound();
  }

  return <ProfileForm profile={profile} />;
}
