import { notFound } from "next/navigation";
import { getBusinessSettings } from "./queries";
import { BusinessForm } from "./business-form";

export async function BusinessSection() {
  const business = await getBusinessSettings();

  // requireUser() has already run, so a missing row means the profile was
  // never created rather than that nobody is signed in.
  if (!business) {
    notFound();
  }

  return <BusinessForm business={business} />;
}
