"use client";

import { AlertCircle, CheckCircle, ImageOff, Lock, Pencil, Plus, RefreshCw, Shield, Trash2, UserRound, X } from "lucide-react";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { CategorySelect, type CategoryGroup } from "@/components/CategorySelect";
import { ImageUploader } from "@/components/ImageUploader";
import { PageLoader } from "@/components/Loader";
import { ListingFilters, EMPTY_GEO, type GeoFilter } from "@/components/ListingFilters";
import { LocationPicker, type LocationValue } from "@/components/LocationPicker";
import { MapPicker, type GeoValue } from "@/components/MapPicker";
import { PageHeader } from "@/components/PageHeader";
import { listingService, supervisorService } from "@/lib/api";
import { getAdmin } from "@/lib/auth";
import { dataUrlToThumb } from "@/lib/image";
import type { Listing, Supervisor } from "@/types/api";

// A broad, real-world catalogue of categories grouped for an easy dropdown.
// `value` is a stable lowercase slug stored on the listing; `label` is shown.
const CATEGORY_GROUPS: CategoryGroup[] = [
  ["Housing & Stay", [
    ["flat", "Flat / Apartment"],
    ["pg", "PG / Hostel"],
    ["room", "Single Room"],
    ["roommate", "Roommate / Sharing"],
    ["house", "House / Villa"],
    ["hotel", "Hotel / Short stay"],
    ["guesthouse", "Guest House / Homestay"],
    ["resort", "Resort"],
    ["farmhouse", "Farmhouse"],
    ["servicedapartment", "Serviced Apartment"],
  ]],
  ["Property & Real Estate", [
    ["plot", "Plot / Land"],
    ["commercial", "Commercial Space"],
    ["office", "Office Space"],
    ["coworking", "Coworking Space"],
    ["shop", "Shop / Showroom"],
    ["warehouse", "Warehouse / Godown"],
    ["rental", "Other Rental"],
    ["realestateagent", "Real Estate Agent"],
  ]],
  ["Home Services", [
    ["cleaning", "Home Cleaning"],
    ["deepcleaning", "Deep Cleaning"],
    ["pestcontrol", "Pest Control"],
    ["plumber", "Plumber"],
    ["electrician", "Electrician"],
    ["carpenter", "Carpenter"],
    ["painter", "Painting"],
    ["acrepair", "AC Repair & Service"],
    ["appliancerepair", "Appliance Repair"],
    ["waterpurifier", "Water Purifier Service"],
    ["gardening", "Gardening / Landscaping"],
    ["interiordesign", "Interior Design"],
    ["renovation", "Home Renovation"],
    ["cctv", "CCTV / Security Install"],
    ["packersmovers", "Packers & Movers"],
    ["welding", "Welding / Fabrication"],
    ["roofing", "Roofing / Waterproofing"],
  ]],
  ["Domestic Help", [
    ["maid", "Maid / Housekeeping"],
    ["cook", "Cook"],
    ["nanny", "Nanny / Babysitter"],
    ["driver", "Driver"],
    ["caretaker", "Caretaker"],
    ["securityguard", "Security Guard"],
    ["eldercare", "Elderly Care"],
  ]],
  ["Beauty & Personal Care", [
    ["salon", "Salon (Unisex)"],
    ["barber", "Barber / Men's Grooming"],
    ["spa", "Spa & Massage"],
    ["makeup", "Makeup Artist"],
    ["mehndi", "Mehndi Artist"],
    ["beautician", "Beautician (At Home)"],
    ["tattoo", "Tattoo Studio"],
    ["nailart", "Nail Art"],
  ]],
  ["Health & Wellness", [
    ["doctor", "Doctor / Clinic"],
    ["dentist", "Dentist"],
    ["physiotherapy", "Physiotherapy"],
    ["nursing", "Nursing / Home Care"],
    ["pharmacy", "Pharmacy / Medical"],
    ["labtest", "Lab / Diagnostic Test"],
    ["ambulance", "Ambulance"],
    ["gym", "Gym / Fitness"],
    ["yoga", "Yoga / Meditation"],
    ["dietician", "Dietician / Nutrition"],
    ["mentalhealth", "Counselling / Therapy"],
    ["veterinary", "Veterinary"],
  ]],
  ["Education & Coaching", [
    ["tutor", "Tutor / Home Tuition"],
    ["coaching", "Coaching / Exam Prep"],
    ["musicclass", "Music Classes"],
    ["danceclass", "Dance Classes"],
    ["artclass", "Art & Craft Classes"],
    ["languageclass", "Language Classes"],
    ["sportscoaching", "Sports Coaching"],
    ["skilltraining", "Skill / Vocational Training"],
  ]],
  ["Events & Photography", [
    ["catering", "Catering"],
    ["eventplanner", "Event / Wedding Planner"],
    ["photography", "Photography"],
    ["videography", "Videography"],
    ["dj", "DJ / Sound"],
    ["decoration", "Decoration / Florist"],
    ["tenthouse", "Tent House"],
    ["band", "Band / Live Music"],
    ["anchor", "Anchor / Host"],
  ]],
  ["Food & Grocery", [
    ["supermarket", "Supermarket / Grocery"],
    ["bakery", "Bakery / Cake"],
    ["restaurant", "Restaurant / Café"],
    ["cloudkitchen", "Cloud Kitchen"],
    ["tiffin", "Tiffin / Meal Service"],
    ["milk", "Milk / Dairy Delivery"],
    ["watersupply", "Water Can Supply"],
    ["meatshop", "Meat / Fish Shop"],
    ["vegetables", "Vegetable / Fruit Vendor"],
  ]],
  ["Automobile", [
    ["carrental", "Car Rental"],
    ["bikerental", "Bike Rental"],
    ["carrepair", "Car Repair / Garage"],
    ["bikerepair", "Bike Repair"],
    ["carwash", "Car Wash / Detailing"],
    ["towing", "Towing / Roadside"],
    ["drivingschool", "Driving School"],
    ["cardealer", "Car / Bike Dealer"],
    ["spareparts", "Spare Parts"],
  ]],
  ["Professional & Business", [
    ["lawyer", "Lawyer / Legal"],
    ["accountant", "Accountant / CA"],
    ["taxconsultant", "Tax / GST Consultant"],
    ["financialadvisor", "Financial Advisor"],
    ["insurance", "Insurance Agent"],
    ["notary", "Notary / Documentation"],
    ["consultant", "Business Consultant"],
    ["recruitment", "Recruitment / HR"],
    ["architect", "Architect"],
  ]],
  ["Tech & Digital", [
    ["webdevelopment", "Web Development"],
    ["appdevelopment", "App / Mobile Development"],
    ["graphicdesign", "Graphic Design"],
    ["digitalmarketing", "Digital Marketing / SEO"],
    ["computerrepair", "Computer / Laptop Repair"],
    ["mobilerepair", "Mobile Repair"],
    ["itsupport", "IT Support / AMC"],
    ["dataentry", "Data Entry"],
  ]],
  ["Software & IT Services", [
    ["softwaredevelopment", "Software Development"],
    ["softwareconsultancy", "Software / IT Consultancy"],
    ["uiuxdesign", "UI / UX Design"],
    ["qatesting", "QA / Software Testing"],
    ["cloudservices", "Cloud / DevOps"],
    ["cybersecurity", "Cybersecurity"],
    ["datascience", "AI / ML / Data Science"],
    ["databaseservices", "Database / DBA"],
    ["erpcrm", "ERP / CRM Solutions"],
    ["ecommercesetup", "E-commerce Setup"],
    ["softwaresupport", "Software Support / Maintenance"],
    ["gamedevelopment", "Game Development"],
    ["blockchain", "Blockchain / Web3"],
  ]],
  ["Training & Career", [
    ["ittraining", "IT / Software Training"],
    ["jobconsultancy", "Job / Placement Consultancy"],
    ["careercounseling", "Career Counselling"],
    ["resumewriting", "Resume / CV Writing"],
    ["interviewprep", "Interview Preparation"],
    ["corporatetraining", "Corporate Training"],
    ["onlinecourses", "Online Courses / E-learning"],
    ["certificationcoaching", "Certification Coaching"],
    ["internshiptraining", "Internship / Industrial Training"],
    ["studyabroad", "Study Abroad / Visa Consultancy"],
  ]],
  ["Logistics & Delivery", [
    ["courier", "Courier / Parcel"],
    ["transport", "Transport / Truck"],
    ["cargo", "Cargo / Freight"],
    ["delivery", "Local Delivery"],
  ]],
  ["Apparel & Repair", [
    ["tailor", "Tailor / Boutique"],
    ["laundry", "Laundry / Dry Clean"],
    ["cobbler", "Cobbler / Shoe Repair"],
    ["embroidery", "Embroidery"],
  ]],
  ["Pets", [
    ["petgrooming", "Pet Grooming"],
    ["petboarding", "Pet Boarding / Daycare"],
    ["pettrainer", "Pet Trainer"],
    ["petshop", "Pet Shop / Supplies"],
  ]],
  ["Other Services", [
    ["printing", "Printing / Xerox"],
    ["astrology", "Astrology / Pooja"],
    ["priest", "Priest / Pandit"],
    ["translation", "Translation"],
    ["scrapdealer", "Scrap Dealer"],
    ["locksmith", "Locksmith"],
    ["signboard", "Signboard / Banner"],
    ["securityservices", "Security Services"],
    ["service", "Other Home Service"],
    ["general", "General / Other"],
  ]],
];

// Colors cycled across supervisor filter badges.
const BADGE_COLORS = [
  "bg-violet-50 text-violet-700 ring-violet-200",
  "bg-sky-50 text-sky-700 ring-sky-200",
  "bg-emerald-50 text-emerald-700 ring-emerald-200",
  "bg-amber-50 text-amber-700 ring-amber-200",
  "bg-rose-50 text-rose-700 ring-rose-200",
  "bg-cyan-50 text-cyan-700 ring-cyan-200",
  "bg-fuchsia-50 text-fuchsia-700 ring-fuchsia-200",
  "bg-teal-50 text-teal-700 ring-teal-200",
];
const BADGE_ACTIVE = [
  "bg-violet-600 text-white ring-violet-600",
  "bg-sky-600 text-white ring-sky-600",
  "bg-emerald-600 text-white ring-emerald-600",
  "bg-amber-500 text-white ring-amber-500",
  "bg-rose-600 text-white ring-rose-600",
  "bg-cyan-600 text-white ring-cyan-600",
  "bg-fuchsia-600 text-white ring-fuchsia-600",
  "bg-teal-600 text-white ring-teal-600",
];

const EMPTY_FORM = {
  title: "",
  category: "flat",
  budget: "",
  availability: "",
  description: "",
  ownerName: "",
  ownerPhone: "",
  mapLink: "",
  address: "",
  landmark: "",
  timings: "",
  services: "",
};

export default function ListingsPage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [rematchNote, setRematchNote] = useState("");
  const [form, setForm] = useState(EMPTY_FORM);
  const [loc, setLoc] = useState<LocationValue>({ location: "" });
  const [geo, setGeo] = useState<GeoValue>({});
  const [images, setImages] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loadingList, setLoadingList] = useState(true);
  // OTP verification of the owner's phone
  const [otp, setOtp] = useState({ sent: false, code: "", verified: false, dev: "", busy: false });
  const [creatorFilter, setCreatorFilter] = useState("");
  const [geoFilter, setGeoFilter] = useState<GeoFilter>(EMPTY_GEO);
  const [appliedGeo, setAppliedGeo] = useState<GeoFilter>(EMPTY_GEO);
  const [supervisors, setSupervisors] = useState<Supervisor[]>([]);

  const me = getAdmin();
  const isOwner = me?.role === "owner" || me?.role === "admin";
  const creatorId = (l: Listing) =>
    typeof l.createdBy === "object" && l.createdBy ? l.createdBy._id : (l.createdBy as string | undefined);
  // A supervisor may only edit/delete listings they created; the owner edits all.
  const canManage = (l: Listing) => isOwner || (!!me && creatorId(l) === me.id);

  const loadListings = useCallback(async () => {
    setLoadingList(true);
    try {
      const result = await listingService.list({
        createdBy: creatorFilter || undefined,
        state: appliedGeo.state || undefined,
        district: appliedGeo.district || undefined,
        area: appliedGeo.area || undefined,
        pincode: appliedGeo.pincodes.length ? appliedGeo.pincodes.join(",") : undefined,
      });
      setListings(result.data);
    } finally {
      setLoadingList(false);
    }
  }, [creatorFilter, appliedGeo]);

  // Debounce filter changes (pincode typing) before querying.
  useEffect(() => {
    const t = setTimeout(() => setAppliedGeo(geoFilter), 300);
    return () => clearTimeout(t);
  }, [geoFilter]);

  // Owner gets supervisor filter badges.
  useEffect(() => {
    if (!isOwner) return;
    supervisorService
      .list()
      .then((r) => setSupervisors(r.data))
      .catch(() => {});
  }, [isOwner]);

  // Supervisor badges appear ONLY after a pincode is selected. Show supervisors
  // who are EITHER assigned to that pincode (territory) OR who created a listing
  // currently shown for it — so the badges stay consistent with the per-listing
  // creator badges.
  const showSupervisorBadges = isOwner && geoFilter.pincodes.length > 0;
  const listingCreatorIds = new Set(listings.map((l) => creatorId(l)).filter(Boolean));
  const shownSupervisors = supervisors.filter(
    (s) =>
      listingCreatorIds.has(s._id) ||
      (s.territories || []).some((t) => t.level === "pincode" && geoFilter.pincodes.includes(t.value)),
  );

  useEffect(() => {
    loadListings().catch((err) => setError(err.message));
  }, [loadListings]);

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setLoc({ location: "" });
    setGeo({});
    setImages([]);
    setEditingId(null);
    setOtp({ sent: false, code: "", verified: false, dev: "", busy: false });
  };

  const startEdit = async (id: string) => {
    setError("");
    try {
      const l = await listingService.get(id);
      setEditingId(id);
      setForm({
        title: l.title || "",
        category: l.category || "flat",
        budget: l.budget ? String(l.budget) : "",
        availability: l.availability || "",
        description: l.description || "",
        ownerName: l.ownerName || "",
        ownerPhone: l.ownerPhone || "",
        mapLink: l.mapLink || "",
        address: l.address || "",
        landmark: l.landmark || "",
        timings: l.timings || "",
        services: l.services || "",
      });
      setLoc({
        location: l.location || "",
        country: l.metadata?.country,
        state: l.metadata?.state,
        city: l.metadata?.city,
        area: l.metadata?.area,
        pincode: l.metadata?.pincode,
      });
      setGeo(l.geo || {});
      setImages(l.images || []);
      // Editing doesn't require re-OTP; treat an already-verified listing as ok.
      setOtp({ sent: false, code: "", verified: !!l.phoneVerified, dev: "", busy: false });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load listing");
    }
  };

  // OTP: owner phone verification (the same APIs the mobile app will use).
  const needsOtp = !editingId && !!form.ownerPhone.trim() && !otp.verified;

  const sendOtp = async () => {
    if (!form.ownerPhone.trim()) {
      setError("Enter the owner's phone first");
      return;
    }
    setError("");
    setOtp((o) => ({ ...o, busy: true }));
    try {
      const res = await listingService.otpSend(form.ownerPhone);
      setOtp((o) => ({ ...o, sent: true, dev: res.devCode || "", busy: false }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to send OTP");
      setOtp((o) => ({ ...o, busy: false }));
    }
  };

  const verifyOtp = async () => {
    setError("");
    setOtp((o) => ({ ...o, busy: true }));
    try {
      await listingService.otpVerify(form.ownerPhone, otp.code);
      setOtp((o) => ({ ...o, verified: true, busy: false }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Invalid OTP");
      setOtp((o) => ({ ...o, busy: false }));
    }
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setRematchNote("");
    if (needsOtp) {
      setError("Please verify the owner's phone with OTP before listing the business.");
      return;
    }
    setSaving(true);

    try {
      const coverThumb = images[0] ? await dataUrlToThumb(images[0]) : "";
      const payload = {
        ...form,
        // Mirror owner contact into the customer-facing contact for WhatsApp.
        contactName: form.ownerName,
        contactPhone: form.ownerPhone,
        location: loc.location,
        budget: form.budget ? Number(form.budget) : undefined,
        images,
        coverThumb,
        geo,
        metadata: {
          country: loc.country,
          state: loc.state,
          city: loc.city,
          area: loc.area,
          pincode: loc.pincode,
        },
        keywords: `${form.title} ${form.description} ${form.services} ${loc.location} ${loc.area || ""} ${loc.city || ""} ${loc.state || ""}`
          .split(/\s+/)
          .filter(Boolean),
      };

      if (editingId) {
        await listingService.update(editingId, payload);
        setRematchNote("Listing updated.");
      } else {
        await listingService.create(payload);
        setRematchNote("Business listed. Active leads will get a match update within 1 minute.");
      }
      resetForm();
      await loadListings();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save listing");
    } finally {
      setSaving(false);
    }
  };

  const deleteListing = async (id: string) => {
    await listingService.remove(id);
    setListings((items) => items.filter((l) => l._id !== id));
    if (editingId === id) resetForm();
  };

  const field = "h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100";

  return (
    <AppShell>
      <PageHeader
        title="Listings"
        description="Create supply records with photos, exact map location, and a contact number. Adding a listing re-notifies active leads."
      />

      {error ? <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}
      {rematchNote ? (
        <div className="mb-4 flex items-center gap-2 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
          <CheckCircle size={15} className="shrink-0" />
          {rematchNote}
        </div>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[420px_1fr]">
        {/* ── Create / Edit form ── */}
        <form onSubmit={submit} className="h-fit rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-950">{editingId ? "Edit listing" : "New listing"}</h2>
            {editingId ? (
              <button type="button" onClick={resetForm} className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800">
                <X size={13} /> Cancel edit
              </button>
            ) : null}
          </div>

          <div className="mt-4 space-y-3">
            <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={field} placeholder="Business name *" required />
            <CategorySelect
              groups={CATEGORY_GROUPS}
              value={form.category}
              onChange={(category) => setForm({ ...form, category })}
            />

            <div>
              <p className="mb-1 text-xs font-semibold text-slate-500">Photos</p>
              <ImageUploader images={images} onChange={setImages} />
            </div>

            {/* ── Owner + OTP verification ── */}
            <div className="rounded-md border border-slate-200 bg-slate-50/60 p-3">
              <p className="mb-2 text-xs font-semibold text-slate-500">Owner &amp; verification</p>
              <input value={form.ownerName} onChange={(e) => setForm({ ...form, ownerName: e.target.value })} className={`${field} mb-2`} placeholder="Owner name" />
              <div className="flex gap-2">
                <input
                  value={form.ownerPhone}
                  onChange={(e) => {
                    setForm({ ...form, ownerPhone: e.target.value });
                    setOtp({ sent: false, code: "", verified: false, dev: "", busy: false });
                  }}
                  className={field}
                  placeholder="Owner phone"
                  inputMode="tel"
                  disabled={otp.verified}
                />
                {otp.verified ? (
                  <span className="inline-flex h-10 shrink-0 items-center gap-1 rounded-md bg-emerald-50 px-2.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">
                    <CheckCircle size={14} /> Verified
                  </span>
                ) : (
                  <button type="button" onClick={sendOtp} disabled={otp.busy || !form.ownerPhone.trim()} className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-md bg-slate-900 px-3 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-40">
                    {otp.busy ? "…" : otp.sent ? "Resend" : "Send OTP"}
                  </button>
                )}
              </div>
              {otp.sent && !otp.verified ? (
                <div className="mt-2 flex gap-2">
                  <input value={otp.code} onChange={(e) => setOtp((o) => ({ ...o, code: e.target.value.replace(/\D/g, "").slice(0, 6) }))} className={field} placeholder="Enter OTP" inputMode="numeric" />
                  <button type="button" onClick={verifyOtp} disabled={otp.busy || otp.code.length < 4} className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-md bg-teal-700 px-3 text-xs font-semibold text-white hover:bg-teal-800 disabled:opacity-40">
                    Verify
                  </button>
                </div>
              ) : null}
              {otp.dev && !otp.verified ? (
                <p className="mt-1.5 text-[11px] text-amber-600">Dev OTP (no SMS provider yet): <span className="font-mono font-bold">{otp.dev}</span></p>
              ) : null}
            </div>

            <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className={field} placeholder="Address" />
            <input value={form.landmark} onChange={(e) => setForm({ ...form, landmark: e.target.value })} className={field} placeholder="Landmark (near / opposite / beside)" />
            <input value={form.mapLink} onChange={(e) => setForm({ ...form, mapLink: e.target.value })} className={field} placeholder="Google Maps link (paste)" />
            <input value={form.timings} onChange={(e) => setForm({ ...form, timings: e.target.value })} className={field} placeholder="Timings (e.g. Mon–Sat 9am–9pm)" />
            <textarea value={form.services} onChange={(e) => setForm({ ...form, services: e.target.value })} className="min-h-16 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-600" placeholder="Services offered (free text — e.g. bike & auto repair, servicing, puncture)" />

            <div>
              <p className="mb-1 text-xs font-semibold text-slate-500">Location (area / pincode)</p>
              <LocationPicker value={loc} onChange={setLoc} />
            </div>

            <div>
              <p className="mb-1 text-xs font-semibold text-slate-500">Exact location (map)</p>
              <MapPicker value={geo} onChange={setGeo} />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <input value={form.budget} onChange={(e) => setForm({ ...form, budget: e.target.value })} className={field} placeholder="Budget / price" type="number" />
              <input value={form.availability} onChange={(e) => setForm({ ...form, availability: e.target.value })} className={field} placeholder="Availability" />
            </div>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="min-h-16 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-600" placeholder="Description (optional)" />

            {needsOtp ? (
              <p className="text-[11px] font-medium text-amber-600">Verify the owner&apos;s phone with OTP to list the business.</p>
            ) : null}
            <button disabled={saving || needsOtp} className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-teal-700 text-sm font-semibold text-white hover:bg-teal-800 disabled:bg-slate-400">
              <Plus size={16} />
              {saving ? "Saving…" : editingId ? "Update listing" : "List business"}
            </button>
          </div>
        </form>

        {/* ── Inventory ── */}
        <section className="rounded-lg border border-slate-200 bg-white shadow-sm xl:sticky xl:top-6 xl:self-start">
          <div className="space-y-2.5 border-b border-slate-200 px-4 py-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-slate-950">
                Active inventory <span className="ml-1 text-xs font-normal text-slate-400">({listings.length})</span>
              </h2>
              <button type="button" onClick={() => loadListings().catch((err) => setError(err.message))} className="inline-flex h-8 items-center gap-2 rounded-md border border-slate-300 px-2 text-xs font-medium hover:bg-slate-50">
                <RefreshCw size={14} /> Refresh
              </button>
            </div>

            {/* Cascading location filters: state → district → area + pincode */}
            <ListingFilters value={geoFilter} onChange={setGeoFilter} />

            {/* Supervisor badges — only after a pincode is selected (owner only) */}
            {showSupervisorBadges ? (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] font-semibold text-slate-500">Supervisors:</span>
                {shownSupervisors.length === 0 ? (
                  <span className="inline-flex items-center gap-1 rounded-md bg-red-50 px-2 py-1 text-[11px] font-semibold text-red-600 ring-1 ring-red-200">
                    <AlertCircle size={12} /> No supervisor registered for this pincode yet
                  </span>
                ) : (
                  <>
                  <button
                    type="button"
                    onClick={() => setCreatorFilter("")}
                    className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 transition ${
                      creatorFilter === "" ? "bg-slate-800 text-white ring-slate-800" : "bg-white text-slate-600 ring-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    All
                  </button>
                  {shownSupervisors.map((s) => {
                    const i = supervisors.findIndex((x) => x._id === s._id);
                    const active = creatorFilter === s._id;
                    // Show only the pincode(s) that match the current selection.
                    const terr = (s.territories || [])
                      .filter((t) => t.level === "pincode" && geoFilter.pincodes.includes(t.value))
                      .map((t) => t.value)
                      .join(", ");
                    return (
                      <button
                        key={s._id}
                        type="button"
                        onClick={() => setCreatorFilter(active ? "" : s._id)}
                        title={terr ? `Territory: ${terr}` : "No territory assigned"}
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 transition ${
                          active ? BADGE_ACTIVE[i % BADGE_ACTIVE.length] : `${BADGE_COLORS[i % BADGE_COLORS.length]} hover:opacity-80`
                        }`}
                      >
                        <UserRound size={11} />
                        {s.name}
                        {terr ? <span className="opacity-70">· {terr}</span> : null}
                      </button>
                    );
                  })}
                  </>
                )}
              </div>
            ) : null}
          </div>

          {loadingList ? (
            <PageLoader label="Loading listings…" />
          ) : listings.length === 0 ? (
            <p className="px-4 py-6 text-sm text-slate-500">No listings yet — create one.</p>
          ) : (
            <div className="max-h-[calc(100vh-15rem)] divide-y divide-slate-100 overflow-y-auto">
              {listings.map((listing) => (
                <article key={listing._id} className="flex gap-3 px-4 py-4">
                  {/* cover thumb */}
                  <div className="h-16 w-16 shrink-0 overflow-hidden rounded-md border border-slate-200 bg-slate-50">
                    {listing.coverThumb ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={listing.coverThumb} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-slate-300">
                        <ImageOff size={18} />
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="truncate font-semibold text-slate-950">{listing.title}</h3>
                      <div className="flex shrink-0 items-center gap-1.5">
                        {canManage(listing) ? (
                          <>
                            <button type="button" onClick={() => startEdit(listing._id).catch((err) => setError(err.message))} title="Edit" className="text-slate-400 hover:text-teal-700">
                              <Pencil size={14} />
                            </button>
                            <button type="button" onClick={() => deleteListing(listing._id).catch((err) => setError(err.message))} title="Delete" className="text-slate-400 hover:text-red-600">
                              <Trash2 size={14} />
                            </button>
                          </>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-400" title="Created by another supervisor — view only">
                            <Lock size={10} /> View only
                          </span>
                        )}
                      </div>
                    </div>
                    {listing.services ? (
                      <p className="mt-0.5 line-clamp-2 text-sm text-slate-600">{listing.services}</p>
                    ) : listing.description ? (
                      <p className="mt-0.5 line-clamp-1 text-sm text-slate-600">{listing.description}</p>
                    ) : null}

                    {/* Business registration details */}
                    {(listing.ownerName || listing.ownerPhone || listing.address || listing.landmark || listing.timings || listing.mapLink) ? (
                      <div className="mt-1.5 space-y-0.5 text-xs text-slate-500">
                        {listing.ownerName || listing.ownerPhone ? (
                          <p>
                            👤 {listing.ownerName || "Owner"}
                            {listing.ownerPhone ? ` · ${listing.ownerPhone}` : ""}
                            {listing.phoneVerified ? (
                              <span className="ml-1 inline-flex items-center gap-0.5 text-emerald-600">
                                <CheckCircle size={11} /> verified
                              </span>
                            ) : null}
                          </p>
                        ) : null}
                        {listing.address ? <p>🏠 {listing.address}</p> : null}
                        {listing.landmark ? <p>📌 {listing.landmark}</p> : null}
                        {listing.timings ? <p>🕒 {listing.timings}</p> : null}
                        {listing.mapLink ? (
                          <a href={listing.mapLink} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-teal-600 hover:underline">
                            🗺️ Google Maps
                          </a>
                        ) : null}
                      </div>
                    ) : null}

                    <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
                      <span className="capitalize">{listing.category}</span>
                      {listing.location ? <span>{listing.location}</span> : null}
                      {listing.budget ? <span>₹{listing.budget.toLocaleString()}</span> : null}
                      {listing.geo?.lat ? <span className="text-teal-600">📍 pinned</span> : null}
                      {(() => {
                        const c = typeof listing.createdBy === "object" ? listing.createdBy : null;
                        const adminMade = !c || c.role === "owner" || c.role === "admin";
                        return adminMade ? (
                          <span className="inline-flex items-center gap-1 rounded bg-slate-900 px-1.5 py-0.5 text-[10px] font-bold text-white">
                            <Shield size={10} /> Admin
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded bg-indigo-100 px-1.5 py-0.5 text-[10px] font-bold text-indigo-700">
                            <UserRound size={10} /> {c.name || c.email}
                          </span>
                        );
                      })()}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
