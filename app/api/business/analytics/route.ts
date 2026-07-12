import { NextResponse } from "next/server";
import { getAdminDb, verifyBearer } from "@/lib/firebase-admin";

export const runtime = "nodejs";

/* Business-scoped analytics for the signed-in vendor.

   Resolves the account's `lunaPartners` profile, then loads its venues from
   `eventsV2` (venueIds keys are eventsV2 doc ids, LUNA_PARTNER_*) and their
   like counts from `venueLikes`. Stale venue ids (deleted venues) are
   returned as unpublished rather than dropped, so vendors see the full
   picture of what's linked to their account. */

interface VenueOut {
  id: string;
  name: string;
  category: string;
  location: string;
  imageUrl: string | null;
  website: string | null;
  likes: number;
  live: boolean;
}

function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}

export async function GET(req: Request) {
  const db = getAdminDb();
  if (!db) {
    return NextResponse.json({ error: "Server not configured." }, { status: 503 });
  }

  const uid = await verifyBearer(req);
  if (!uid) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const profileSnap = await db
    .collection("lunaPartners")
    .where("firebaseUid", "==", uid)
    .limit(1)
    .get();
  if (profileSnap.empty) {
    return NextResponse.json({ business: null, venues: [], totals: null });
  }

  const profile = profileSnap.docs[0].data();
  const venueIds = Object.keys(
    profile.venueIds && typeof profile.venueIds === "object" ? profile.venueIds : {}
  ).slice(0, 50);

  const venues: VenueOut[] = [];
  if (venueIds.length) {
    const [venueDocs, likeDocs] = await Promise.all([
      db.getAll(...venueIds.map((id) => db.collection("eventsV2").doc(id))),
      db.getAll(...venueIds.map((id) => db.collection("venueLikes").doc(id))),
    ]);

    venueIds.forEach((id, i) => {
      const v = venueDocs[i];
      const likeData = likeDocs[i].exists ? likeDocs[i].data() ?? {} : {};
      const likes =
        typeof likeData.likeCount === "number" ? likeData.likeCount : 0;

      if (v.exists) {
        const d = v.data() ?? {};
        const images = Array.isArray(d.images) ? d.images : [];
        venues.push({
          id,
          name: str(d.name) || "Unnamed venue",
          category: str(d.dropdownValue) || str(d.chosen_type),
          location: str(d.location),
          imageUrl: str(images[0]) || str(likeData.imageUrl) || null,
          website: str(d.website) || null,
          likes,
          live: true,
        });
      } else {
        venues.push({
          id,
          name: str(likeData.name) || "Unpublished venue",
          category: str(likeData.category),
          location: "",
          imageUrl: str(likeData.imageUrl) || null,
          website: null,
          likes,
          live: false,
        });
      }
    });
  }

  venues.sort((a, b) => b.likes - a.likes);

  return NextResponse.json({
    business: {
      businessName: str(profile.businessName),
      approved: profile.isApproved === true,
      plan: str(profile.planChosen) || null,
      stripeConnected: Boolean(profile.stripeConnectedAccountId),
    },
    venues,
    totals: {
      venues: venues.length,
      liveVenues: venues.filter((v) => v.live).length,
      likes: venues.reduce((s, v) => s + v.likes, 0),
    },
  });
}
