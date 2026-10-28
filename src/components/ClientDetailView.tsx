import { useState, useRef, useEffect } from "react";
import type { ClientUpdatePayload } from "../types/domain";
import type { Brand } from "../types/Types";
import clientBadge from "../assets/clientBadge.svg";
import clientBadgeDark from "../assets/clientBadgeDark.svg";
import emailBadge from "../assets/emailBadge.svg";
import emailBadgeLight from "../assets/emailBadgeLight.svg";
import email from "../assets/email.svg";
import exportContact from "../assets/exportContact.svg";
import importContact from "../assets/importContact.svg";
import searchIcon from "../assets/searchIconBAW.svg";
import trashIcon from "../assets/trashIcon.svg";
import editIcon from "../assets/editIcon.svg"; // Assuming this asset exists
import EditClientModal from "./modal/EditClientModal";
import { EmailComposerModal } from "./modal/Emailcomposermodal";
import { AIAgentFlow } from "./modal/Aiagentflow";
import { clientService } from "../services/clientService";
import { brandService } from "../services/brandService";
import { domainService } from "../services/domainService";

// type ImportFlow = "idle" | "step1" | "file" | "paste" | "success";

interface Folder {
    id: number;
    name: string;
    totalClients: number;
    createdDate: string;
}

interface Client {
    id: number;
    businessName: string;
    email: string;
    phone?: string;
    website?: string;
    gmb?: string;
    facebook?: string;
    twitter?: string;
    instagram?: string;
    yelp?: string;
    group: "Contacted" | "Not Contacted";
    emailsSent: number;
}

function ClientDetailView({
    folder,
    clients,
    onBack,
    onAddClient,
    onImport,
    onDeleteClient,
    onUpdateClient,
    isImporting = false,
}: {
    folder: Folder;
    clients: Client[];
    onBack: () => void;
    onAddClient: () => void;
    onImport: () => void;
    onDeleteClient: (id: number) => void;
    onUpdateClient: (id: number, payload: ClientUpdatePayload) => Promise<void>;
    isImporting?: boolean;
}) {
    const [activeTab, setActiveTab] = useState<"clients" | "emails">("clients");
    const [search, setSearch] = useState("");
    const [show, setShow] = useState(10);
    const [page, setPage] = useState(1);
    const [showExportOptions, setShowExportOptions] = useState(false);
    const [editingClient, setEditingClient] = useState<Client | null>(null);
    const [showComposer, setShowComposer] = useState(false);
    const [showEmailOptions, setShowEmailOptions] = useState(false);
    const [showAIFlow, setShowAIFlow] = useState(false);
    const [showBrandSelection, setShowBrandSelection] = useState(false);
    const [showTemplateSelection, setShowTemplateSelection] = useState(false);
    const [selectedClient, setSelectedClient] = useState<Client | null>(null);
    const [selectedBrand, setSelectedBrand] = useState<Brand | null>(null);
    const [allBrands, setAllBrands] = useState<Brand[]>([]);
    const [tempFolderId, setTempFolderId] = useState<number | null>(null);
    const [aiPrefilled, setAiPrefilled] = useState<any>(null);
    const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);
    const exportRef = useRef<HTMLDivElement>(null);
    const clientsWithEmailCount = clients.filter((c) => c.email).length;
    const isClientsLoading = clients.length < folder.totalClients;

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (
                exportRef.current &&
                !exportRef.current.contains(e.target as Node)
            )
                setShowExportOptions(false);
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    useEffect(() => {
        const loadBrands = async () => {
            try {
                const brands = await brandService.listBrands();
                console.log('[ClientDetailView] Raw brands from API:', brands);
                if (brands && brands.length > 0) {
                    const normalizedBrands = brands.map(b => ({
                        ...b,
                        sendVia: ((b as any).send_via ?? (b as any).sends_via ?? b.sendsVia) as "campaign" | "broadcast" | undefined,
                    }));
                    console.log('[ClientDetailView] Normalized brands:', normalizedBrands);
                    setAllBrands(normalizedBrands);

                    // Load domains for each brand
                    try {
                        const allDomains = await domainService.listDomains();
                        console.log('[ClientDetailView] All domains:', allDomains);
                        const brandsWithDomains = normalizedBrands.map(b => {
                            // Only include verified domains
                            const brandDomains = allDomains.filter(d => d.brand_id === b.id && d.status === "verified");
                            console.log(`[ClientDetailView] Brand ${b.id} (${b.name}) verified domains:`, brandDomains);
                            return { ...b, domains: brandDomains };
                        });
                        setAllBrands(brandsWithDomains);
                    } catch (domainError) {
                        console.error("Failed to load domains for brands:", domainError);
                    }
                }
            } catch (error) {
                console.error("Failed to load brands:", error);
            }
        };
        void loadBrands();
    }, []);

    const handleEmailClient = (client: Client) => {
        if (!client.email) {
            alert("This client does not have an email address.");
            return;
        }
        setSelectedClient(client);
        setShowBrandSelection(true);
    };

    const handleBrandSelect = (brand: Brand) => {
        setSelectedBrand(brand);
        setShowBrandSelection(false);
        setShowEmailOptions(true);
    };

    const handleUseTemplate = async () => {
        if (!selectedClient) return;
        setShowEmailOptions(false);
        setShowTemplateSelection(true);
    };

    const handleTemplateSelect = async (templateId: number) => {
        if (!selectedClient || !selectedBrand) return;
        setShowTemplateSelection(false);

        let createdTempFolderId: number | null = null;
        let createdClientId: number | null = null;

        try {
            console.log('[handleTemplateSelect] Selected client:', selectedClient);
            console.log('[handleTemplateSelect] Client email:', selectedClient.email);

            // Create temporary folder with client's business name
            const tempFolderName = `Temp-${selectedClient.businessName.trim()}-${Date.now()}`;
            console.log('[handleTemplateSelect] Creating temp folder:', tempFolderName);
            const tempFolder = await clientService.createCategory(tempFolderName, "");
            createdTempFolderId = tempFolder.data.data.id;
            console.log('[handleTemplateSelect] Temp folder created with ID:', createdTempFolderId);
            setTempFolderId(createdTempFolderId);

            // Create a copy of the client in the temporary folder
            console.log('[handleTemplateSelect] Creating copy of client...');
            const createPayload: any = {
                business_name: selectedClient.businessName,
                client_cat_id: createdTempFolderId,
                email: selectedClient.email,
                phone: selectedClient.phone,
                website: selectedClient.website,
            };
            const createdClient = await clientService.addClientManual(createPayload);
            createdClientId = createdClient?.data?.id;
            console.log('[handleTemplateSelect] Client copy created with ID:', createdClientId);

            if (!createdClientId) throw new Error("Failed to create client copy");

            // Verify the client is in the temp folder
            const clientsInTempFolder = await clientService.getSavedClients(createdTempFolderId || undefined);
            console.log('[handleTemplateSelect] Clients in temp folder:', clientsInTempFolder);

            // Set selected template and open composer
            setSelectedTemplateId(templateId);
            setShowComposer(true);
        } catch (error) {
            console.error("Failed to prepare email for client:", error);
            alert("Failed to prepare email. Please try again.");

            // Clean up temporary folder if it was created
            if (createdTempFolderId) {
                try {
                    await clientService.deleteCategory(createdTempFolderId);
                    setTempFolderId(null);
                } catch (cleanupError) {
                    console.error("Failed to clean up temporary folder:", cleanupError);
                }
            }
        }
    };

    const handleUseAIFlow = async () => {
        if (!selectedClient || !selectedBrand) return;
        setShowEmailOptions(false);
        setShowAIFlow(true);
    };

    const handleAIDone = async (prefilled: any) => {
        setShowAIFlow(false);

        if (!selectedClient || !selectedBrand) return;

        let createdTempFolderId: number | null = null;
        let createdClientId: number | null = null;

        try {
            console.log('[handleAIDone] Selected client:', selectedClient);
            console.log('[handleAIDone] Client email:', selectedClient.email);

            // Create temporary folder with client's business name
            const tempFolderName = `Temp-${selectedClient.businessName.trim()}-${Date.now()}`;
            console.log('[handleAIDone] Creating temp folder:', tempFolderName);
            const tempFolder = await clientService.createCategory(tempFolderName, "");
            createdTempFolderId = tempFolder.data.data.id;
            console.log('[handleAIDone] Temp folder created with ID:', createdTempFolderId);
            setTempFolderId(createdTempFolderId);

            // Create a copy of the client in the temporary folder
            console.log('[handleAIDone] Creating copy of client...');
            const createPayload: any = {
                business_name: selectedClient.businessName,
                client_cat_id: createdTempFolderId,
                email: selectedClient.email,
                phone: selectedClient.phone,
                website: selectedClient.website,
            };
            const createdClient = await clientService.addClientManual(createPayload);
            createdClientId = createdClient?.data?.id;
            console.log('[handleAIDone] Client copy created with ID:', createdClientId);

            if (!createdClientId) throw new Error("Failed to create client copy");

            // Verify the client is in the temp folder
            const clientsInTempFolder = await clientService.getSavedClients(createdTempFolderId || undefined);
            console.log('[handleAIDone] Clients in temp folder:', clientsInTempFolder);

            // Set AI prefilled data and open composer
            setAiPrefilled(prefilled);
            setShowComposer(true);
        } catch (error) {
            console.error("Failed to prepare email for client:", error);
            alert("Failed to prepare email. Please try again.");

            // Clean up temporary folder if it was created
            if (createdTempFolderId) {
                try {
                    await clientService.deleteCategory(createdTempFolderId);
                    setTempFolderId(null);
                } catch (cleanupError) {
                    console.error("Failed to clean up temporary folder:", cleanupError);
                }
            }
        }
    };

    const handleComposerClose = async () => {
        setShowComposer(false);

        // Delete temporary folder (contains the client copy)
        if (tempFolderId) {
            try {
                console.log('[handleComposerClose] Deleting temporary folder:', tempFolderId);
                await clientService.deleteCategory(tempFolderId);
                setTempFolderId(null);
                console.log('[handleComposerClose] Temporary folder deleted successfully');
            } catch (error) {
                console.error("Failed to clean up temporary folder:", error);
            }
        }
    };

    const handleExport = async (format: "xlsx" | "csv" | "xml" | "json") => {
        try {
            const exportData = clients.map((c) => ({
                "Client Name": c.businessName,
                Email: c.email,
                Phone: c.phone,
                Website: c.website || "",
                GMB: c.gmb || "",
                Facebook: c.facebook || "",
                "X (twitter)": c.twitter || "",
                Instagram: c.instagram || "",
            }));

            let content: string;
            let mimeType: string;

            if (format === "json") {
                content = JSON.stringify(exportData, null, 2);
                mimeType = "application/json";
            } else if (format === "csv") {
                const headers = Object.keys(exportData[0] || {});
                const csvRows = [
                    headers.join(","),
                    ...exportData.map((row) =>
                        headers
                            .map((header) => {
                                const value = row[header as keyof typeof row];
                                const stringValue = String(value || "");
                                return stringValue.includes(",")
                                    ? `"${stringValue.replace(/"/g, '""')}"`
                                    : stringValue;
                            })
                            .join(","),
                    ),
                ];
                content = csvRows.join("\n");
                mimeType = "text/csv";
            } else if (format === "xml") {
                const xmlRows = exportData
                    .map(
                        (row) => `
  <client>
    ${Object.entries(row)
        .map(([key, value]) => `    <${key}>${value || ""}</${key}>`)
        .join("\n")}
  </client>`,
                    )
                    .join("");
                content = `<?xml version="1.0" encoding="UTF-8"?>\n<clients>\n${xmlRows}\n</clients>`;
                mimeType = "application/xml";
            } else {
                // xlsx - simple HTML table format that Excel can open
                const headers = Object.keys(exportData[0] || {});
                const tableRows = [
                    `<tr>${headers.map((h) => `<th>${h}</th>`).join("")}</tr>`,
                    ...exportData.map(
                        (row) =>
                            `<tr>${headers
                                .map((header) => `<td>${row[header as keyof typeof row] || ""}</td>`)
                                .join("")}</tr>`,
                    ),
                ];
                content = `<html><head><meta charset="UTF-8"></head><body><table border="1">${tableRows.join("")}</table></body></html>`;
                mimeType = "application/vnd.ms-excel";
            }

            const blob = new Blob([content], { type: mimeType });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.setAttribute("download", `clients_export_${folder.name}.${format}`);
            document.body.appendChild(link);
            link.click();
            link.parentNode?.removeChild(link);
            setShowExportOptions(false);
        } catch (error) {
            console.error("Export failed", error);
            alert("Failed to export contacts. Please try again.");
        }
    };

    const emailsSentCount = clients.filter(
        (c) => c.group === "Contacted",
    ).length;
    const filtered = clients.filter(
        (c) =>
            c.businessName.toLowerCase().includes(search.toLowerCase()) ||
            c.email.toLowerCase().includes(search.toLowerCase()),
    );
    const totalPages = Math.ceil(filtered.length / show);
    const paginated = filtered.slice((page - 1) * show, page * show);

    return (
        <div className="min-h-screen bg-gray-50 p-3 sm:p-6">
            <div className="max-w-7xl mx-auto">
                <div className="text-center mb-6">
                    <h1 className="text-2xl font-bold text-gray-900">
                        Manage Clients
                    </h1>
                    <p className="text-gray-500 text-sm mt-1">
                        Organize and manage your saved Clients
                    </p>
                </div>

                {/* Stats tabs */}
                <div className="flex gap-3 flex-row items-center content-center justify-between mb-4">
                    <div className="flex gap-1 sm:gap-3">
                        <button
                            onClick={() => setActiveTab("clients")}
                            className={`flex items-center gap-3 px-3 py-2 sm:px-7 sm:py-5 rounded-xl font-semibold text-sm cursor-pointer transition-all ${activeTab === "clients" ? "bg-[#337DD3] text-white shadow-md" : "bg-white text-gray-600 border border-gray-200 hover:border-blue-300"}`}
                        >
                            <span className="text-xl">
                                <img
                                    src={
                                        activeTab === "clients"
                                            ? clientBadge
                                            : clientBadgeDark
                                    }
                                    alt="Client Badge"
                                />
                            </span>
                            <div className="text-left">
                                <div className="text-lg font-bold leading-none">
                                    {folder.totalClients}
                                </div>
                                <div
                                    className={`text-xs ${activeTab === "clients" ? "text-blue-100" : "text-gray-400"}`}
                                >
                                    Clients
                                </div>
                            </div>
                        </button>
                        <button
                            onClick={() => setActiveTab("emails")}
                            className={`flex items-center gap-3 px-3 py-2 sm:px-7 sm:py-5 rounded-xl font-semibold text-sm cursor-pointer transition-all ${activeTab === "emails" ? "bg-[#337DD3] text-white shadow-md" : "bg-white text-gray-600 border border-gray-200 hover:border-blue-300"}`}
                        >
                            <span className="text-xl">
                                <img
                                    src={
                                        activeTab === "emails"
                                            ? emailBadgeLight
                                            : emailBadge
                                    }
                                    alt="Email Badge"
                                />
                            </span>
                            <div className="text-left">
                                <div className="text-lg font-bold leading-none">
                                    {clientsWithEmailCount}
                                </div>
                                <div
                                    className={`text-xs ${activeTab === "emails" ? "text-blue-100" : "text-gray-400"}`}
                                >
                                    Emails
                                </div>
                            </div>
                        </button>
                    </div>
                    <button
                        onClick={onBack}
                        className="border border-gray-300 text-gray-700 text-xs sm:text-sm font-semibold px-4 py-1.5 sm:py-2.5 max-w-x rounded-lg hover:bg-gray-50 transition-colors bg-white cursor-pointer"
                    >
                        Back to folder
                    </button>
                </div>

                {/* Client table */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="px-3 sm:px-5 py-4 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between border-b border-gray-100">
                        <div className="flex items-center gap-3">
                            <div
                                className={`w-13 h-13 rounded-full flex items-center justify-center text-white font-bold text-sm ${emailsSentCount > 0 ? "bg-blue-600" : "bg-gray-300"}`}
                            >
                                {emailsSentCount}
                            </div>
                            <span className="text-sm font-medium text-gray-700">
                                Emails Sent
                            </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <div className="relative" ref={exportRef}>
                                <button
                                    onClick={() =>
                                        setShowExportOptions(!showExportOptions)
                                    }
                                    className="flex items-center gap-1.5 border border-gray-200 text-gray-600 text-xs font-semibold px-3 py-4 rounded-lg hover:bg-gray-50 transition-colors uppercase"
                                >
                                    <img
                                        src={exportContact}
                                        className="w-5 h-5"
                                        alt="Export Contacts"
                                    />{" "}
                                    EXPORT CONTACTS
                                </button>
                                {showExportOptions && (
                                    <div className="absolute right-0 mt-2 w-40 bg-white border border-gray-200 rounded-xl shadow-xl z-50 py-2">
                                        {(
                                            [
                                                "xlsx",
                                                "csv",
                                                "xml",
                                                "json",
                                            ] as const
                                        ).map((fmt) => (
                                            <button
                                                key={fmt}
                                                onClick={() =>
                                                    handleExport(fmt)
                                                }
                                                className="w-full text-left px-4 py-2 text-xs text-gray-700 hover:bg-gray-50 transition-colors uppercase font-bold"
                                            >
                                                Download .{fmt}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <button
                                onClick={onImport}
                                disabled={isImporting}
                                className="flex items-center gap-1.5 border border-gray-200 text-gray-600 text-xs font-semibold px-3 py-4 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                                <img
                                    src={importContact}
                                    className="w-5 h-5"
                                    alt="Import Contact"
                                />{" "}
                                {isImporting
                                    ? "IMPORTING..."
                                    : "IMPORT CONTACT"}
                            </button>
                            <button
                                onClick={onAddClient}
                                className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-4 rounded-lg transition-colors"
                            >
                                + ADD NEW CLIENT
                            </button>
                            <span className="text-xs text-gray-400">Show</span>
                            <select
                                value={show}
                                onChange={(e) => {
                                    setShow(Number(e.target.value));
                                    setPage(1);
                                }}
                                className="border border-gray-200 rounded-lg px-4 py-4 text-xs focus:outline-none bg-white"
                            >
                                {[10, 25, 50].map((n) => (
                                    <option key={n}>{n}</option>
                                ))}
                            </select>
                            <span className="text-xs text-gray-400">
                                Entries
                            </span>
                            <div className="relative">
                                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs">
                                    <img
                                        src={searchIcon}
                                        className="w-5 h-5"
                                        alt="Search"
                                    />
                                </span>
                                <input
                                    className="pl-7 pr-3 py-4 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-70 bg-white"
                                    placeholder="Search..."
                                    value={search}
                                    onChange={(e) => {
                                        setSearch(e.target.value);
                                        setPage(1);
                                    }}
                                />
                            </div>
                        </div>
                    </div>

                    {isClientsLoading ? (
                        <div
                            className="flex min-h-56 items-center justify-center gap-2 text-sm text-gray-500"
                            role="status"
                            aria-live="polite"
                        >
                            <span>Loading clients</span>
                            <span className="animate-pulse tracking-widest">
                                ...
                            </span>
                        </div>
                    ) : activeTab === "clients" ? (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="bg-gray-50 border-b border-gray-100">
                                        <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-3 py-5 whitespace-nowrap min-w-45">
                                            Client Name
                                        </th>
                                        <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-3 py-5 whitespace-nowrap min-w-45">
                                            Email
                                        </th>
                                        <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-3 py-5 whitespace-nowrap min-w-35">
                                            Phone
                                        </th>
                                        <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-3 py-5 whitespace-nowrap min-w-35">
                                            Website
                                        </th>
                                        <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-3 py-5 whitespace-nowrap min-w-20">
                                            GMB
                                        </th>
                                        <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-3 py-5 whitespace-nowrap min-w-20">
                                            Facebook
                                        </th>
                                        <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-3 py-5 whitespace-nowrap min-w-20">
                                            X (twitter)
                                        </th>
                                        <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-3 py-5 whitespace-nowrap min-w-20">
                                            Instagram
                                        </th>
                                        <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-3 py-5 whitespace-nowrap min-w-20">
                                            Yelp
                                        </th>
                                        <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-3 py-5 whitespace-nowrap min-w-20">
                                            Action
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {paginated.map((c, i) => (
                                        <tr
                                            key={c.id}
                                            className={`border-b border-gray-50 hover:bg-blue-50/20 transition-colors ${i % 2 === 0 ? "bg-white" : "bg-gray-50/40"}`}
                                        >
                                            <td className="px-3 py-5 text-sm text-gray-800 font-medium">
                                                <div
                                                    className="max-w-45 truncate"
                                                    title={c.businessName}
                                                >
                                                    {c.businessName}
                                                </div>
                                            </td>
                                            <td className="px-3 py-5 text-sm text-gray-600">
                                                <div
                                                    className="max-w-45 truncate"
                                                    title={c.email}
                                                >
                                                    {c.email}
                                                </div>
                                            </td>
                                            <td className="px-3 py-5 text-sm text-blue-600">
                                                <div
                                                    className="max-w-35 truncate"
                                                    title={c.phone ?? "—"}
                                                >
                                                    {c.phone ?? "—"}
                                                </div>
                                            </td>
                                            <td className="px-3 py-5 text-sm text-blue-600">
                                                <div
                                                    className="max-w-35 truncate"
                                                    title={c.website ?? "—"}
                                                >
                                                    {c.website ?? "—"}
                                                </div>
                                            </td>
                                            {[
                                                {
                                                    val: c.gmb,
                                                    color: "bg-[rgba(219,142,17,0.18)] text-[#DB8E11]",
                                                },
                                                {
                                                    val: c.facebook,
                                                    color: "bg-[rgba(33,79,212,0.18)] text-[#214FD4]",
                                                },
                                                {
                                                    val: c.twitter,
                                                    color: "bg-[rgba(105,105,105,0.18)] text-[#696969]",
                                                },
                                                {
                                                    val: c.instagram,
                                                    color: "bg-[rgba(222,89,107,0.18)] text-[#DE596B]",
                                                },
                                                {
                                                    val: c.yelp,
                                                    color: "bg-[rgba(250,63,63,0.18)] text-[#FA3F3F]",
                                                },
                                            ].map((platform, idx) => {
                                                const hasUrl =
                                                    platform.val &&
                                                    platform.val !== "@NONE" &&
                                                    platform.val !==
                                                        "Not found" &&
                                                    platform.val !== "null" &&
                                                    platform.val !== "";
                                                return (
                                                    <td
                                                        key={idx}
                                                        className="px-3 py-5"
                                                    >
                                                        <button
                                                            disabled={!hasUrl}
                                                            onClick={() =>
                                                                hasUrl &&
                                                                window.open(
                                                                    platform.val?.startsWith(
                                                                        "http",
                                                                    )
                                                                        ? platform.val
                                                                        : `https://${platform.val}`,
                                                                    "_blank",
                                                                )
                                                            }
                                                            className={`text-xs font-medium px-4 py-2 rounded-lg transition-colors min-w-15 ${hasUrl ? platform.color + " hover:opacity-80" : "bg-gray-100 text-gray-400 cursor-not-allowed"}`}
                                                        >
                                                            Visit
                                                        </button>
                                                    </td>
                                                );
                                            })}
                                            <td className="px-3 py-5 flex items-center gap-1">
                                                <button
                                                    onClick={() =>
                                                        setEditingClient(c)
                                                    }
                                                    className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-500 transition-colors  cursor-pointer"
                                                    title="Edit"
                                                >
                                                    <img
                                                        src={editIcon}
                                                        alt="edit"
                                                        className="w-5 h-5"
                                                    />
                                                </button>
                                                <button
                                                    onClick={() =>
                                                        onDeleteClient(c.id)
                                                    }
                                                    className="p-1.5 rounded-lg hover:bg-red-100 text-gray-400 hover:text-red-500 transition-colors cursor-pointer"
                                                    title="Delete"
                                                >
                                                    <img
                                                        src={trashIcon}
                                                        alt="trash"
                                                    />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <table className="w-full">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-100">
                                    <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-5 min-w-45">
                                        Business Name
                                    </th>
                                    <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-5 min-w-45">
                                        Email
                                    </th>
                                    <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-5 min-w-25">
                                        Group
                                    </th>
                                    <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-5 min-w-20">
                                        <img src={emailBadge} alt="Email" />
                                    </th>
                                    <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-5 min-w-20">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {paginated.map((c, i) => (
                                    <tr
                                        key={c.id}
                                        className={`border-b border-gray-50 hover:bg-blue-50/20 transition-colors ${i % 2 === 0 ? "bg-white" : "bg-gray-50/40"}`}
                                    >
                                        <td className="px-4 py-5 text-sm text-gray-800 font-medium">
                                            <div
                                                className="max-w-45 truncate"
                                                title={c.businessName}
                                            >
                                                {c.businessName}
                                            </div>
                                        </td>
                                        <td className="px-4 py-5 text-sm text-gray-600">
                                            <div
                                                className="max-w-45 truncate"
                                                title={c.email}
                                            >
                                                {c.email}
                                            </div>
                                        </td>
                                        <td className="px-4 py-5">
                                            <button
                                                className={`text-sm font-medium px-1 ${c.group === "Contacted" ? "text-green-600" : "text-blue-500"}`}
                                            >
                                                {c.group}
                                            </button>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-600">
                                            {c.emailsSent}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => handleEmailClient(c)}
                                                    className="p-1.5 rounded-lg hover:bg-blue-100 text-gray-400 hover:text-blue-600 transition-colors"
                                                    title="Send Email"
                                                >
                                                    <img
                                                        src={email}
                                                        className="h-5 w-5"
                                                        alt="Email"
                                                    />
                                                </button>
                                                <button
                                                    onClick={() =>
                                                        onDeleteClient(c.id)
                                                    }
                                                    className="p-1.5 rounded-lg hover:bg-red-100 text-gray-400 hover:text-red-500 transition-colors"
                                                >
                                                    <img
                                                        src={trashIcon}
                                                        className="h-5 w-5"
                                                        alt="trash"
                                                    />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}

                    <div className="px-4 py-3 flex items-center justify-between border-t border-gray-100">
                        <span className="text-sm text-gray-500">
                            Showing {(page - 1) * show + 1} to{" "}
                            {Math.min(page * show, filtered.length)} of{" "}
                            {filtered.length} entries
                        </span>
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() =>
                                    setPage((p) => Math.max(1, p - 1))
                                }
                                disabled={page === 1}
                                className="px-2 py-1 text-gray-400 hover:text-gray-700 disabled:opacity-30"
                            >
                                ←
                            </button>
                            {Array.from(
                                { length: Math.min(totalPages, 6) },
                                (_, i) => i + 1,
                            ).map((p) => (
                                <button
                                    key={p}
                                    onClick={() => setPage(p)}
                                    className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${p === page ? "bg-blue-600 text-white" : "text-gray-500 hover:bg-gray-100"}`}
                                >
                                    {p}
                                </button>
                            ))}
                            <button
                                onClick={() =>
                                    setPage((p) => Math.min(totalPages, p + 1))
                                }
                                disabled={page === totalPages}
                                className="px-2 py-1 text-gray-400 hover:text-gray-700 disabled:opacity-30"
                            >
                                →
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {showComposer && tempFolderId && selectedBrand && (
                <EmailComposerModal
                    onClose={handleComposerClose}
                    brand={selectedBrand}
                    brandId={selectedBrand.id}
                    preSelectedCategoryId={tempFolderId}
                    prefilled={aiPrefilled}
                    draftId={aiPrefilled?.draftId}
                    templateId={selectedTemplateId || undefined}
                    isSingleClientSend={true}
                />
            )}

            {showAIFlow && selectedBrand && (
                <AIAgentFlow
                    onClose={() => setShowAIFlow(false)}
                    onDone={handleAIDone}
                    brandId={selectedBrand.id}
                    domainId={selectedBrand.domains && selectedBrand.domains.length > 0 ? selectedBrand.domains[0].id : undefined}
                />
            )}

            {showBrandSelection && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4">
                        <h2 className="text-xl font-bold text-gray-900 mb-4">
                            Select Brand
                        </h2>
                        <p className="text-gray-600 mb-6">
                            Which brand would you like to use to send this email?
                        </p>
                        <div className="flex flex-col gap-3 max-h-60 overflow-y-auto">
                            {allBrands.map((b) => {
                                const hasDomains = b.domains && b.domains.length > 0;
                                return (
                                    <button
                                        key={b.id}
                                        onClick={() => hasDomains && handleBrandSelect(b)}
                                        className={`w-full py-3 px-4 text-left font-semibold rounded-xl transition-colors ${
                                            hasDomains
                                                ? "bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200"
                                                : "bg-gray-50 text-gray-400 cursor-not-allowed border border-gray-200"
                                        }`}
                                        disabled={!hasDomains}
                                        title={!hasDomains ? "No verified domains" : ""}
                                    >
                                        <div className="flex justify-between items-center">
                                            <span>{b.name || (b as any).brand_name || `Brand ${b.id}`}</span>
                                            <span className={`text-xs font-normal ${
                                                hasDomains ? "text-green-600" : "text-red-400"
                                            }`}>
                                                {hasDomains ? "✓ Verified" : "No domains"}
                                            </span>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                        <button
                            onClick={() => setShowBrandSelection(false)}
                            className="w-full mt-4 py-3 px-4 border border-gray-300 text-gray-600 font-semibold rounded-xl hover:bg-gray-50 transition-colors"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            {showEmailOptions && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4">
                        <h2 className="text-xl font-bold text-gray-900 mb-4">
                            Send Email to {selectedClient?.businessName}
                        </h2>
                        <p className="text-gray-600 mb-6">
                            How would you like to create this email?
                        </p>
                        <div className="flex flex-col gap-3">
                            <button
                                onClick={handleUseTemplate}
                                className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors"
                            >
                                Use Template
                            </button>
                            <button
                                onClick={handleUseAIFlow}
                                className="w-full py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold rounded-xl transition-colors"
                            >
                                Use AI Flow
                            </button>
                            <button
                                onClick={() => setShowEmailOptions(false)}
                                className="w-full py-3 px-4 border border-gray-300 text-gray-600 font-semibold rounded-xl hover:bg-gray-50 transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showTemplateSelection && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4">
                        <h2 className="text-xl font-bold text-gray-900 mb-4">
                            Select Template
                        </h2>
                        <p className="text-gray-600 mb-6">
                            Which template would you like to use?
                        </p>
                        <div className="flex flex-col gap-3 max-h-60 overflow-y-auto">
                            {[1, 2, 3, 4, 5].map((id) => (
                                <button
                                    key={id}
                                    onClick={() => handleTemplateSelect(id)}
                                    className="w-full py-3 px-4 bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold rounded-xl transition-colors border border-blue-200"
                                >
                                    Template {id}
                                </button>
                            ))}
                        </div>
                        <button
                            onClick={() => setShowTemplateSelection(false)}
                            className="w-full mt-4 py-3 px-4 border border-gray-300 text-gray-600 font-semibold rounded-xl hover:bg-gray-50 transition-colors"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}
            {editingClient && (
                <EditClientModal
                    key={editingClient.id}
                    isOpen={!!editingClient}
                    client={editingClient}
                    onClose={() => setEditingClient(null)}
                    onSave={onUpdateClient}
                />
            )}
        </div>
    );
}

export default ClientDetailView;
