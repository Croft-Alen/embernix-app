import React from "react";

import {
  Document,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";

type InvoicePdfItem = {
  id: string;
  title: string;
  description: string | null;
  quantity: number;
  unit_price_cents: number;
  line_total_cents: number;
};

export type InvoicePdfData = {
  invoice_number: string;
  status: string;
  currency: string;
  subtotal_cents: number;
  discount_cents: number;
  tax_cents: number;
  total_cents: number;
  issued_at: string | null;
  due_at: string | null;
  paid_at: string | null;
  payment_provider: string | null;
  paddle_transaction_id: string | null;
  notes: string | null;
  customer_name: string;
  customer_email: string;
  items: InvoicePdfItem[];
};

const styles = StyleSheet.create({
  page: {
    paddingTop: 38,
    paddingBottom: 34,
    paddingHorizontal: 42,
    backgroundColor: "#ffffff",
    color: "#111111",
    fontSize: 11,
    fontFamily: "Helvetica",
  },

  header: {
    alignItems: "center",
    marginBottom: 28,
    paddingBottom: 18,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },

  logo: {
    width: 42,
    height: 42,
    marginBottom: 8,
    objectFit: "contain",
  },

  brand: {
    fontSize: 19,
    fontWeight: 700,
    color: "#111111",
  },

  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 26,
  },

  invoiceTitle: {
    fontSize: 24,
    fontWeight: 700,
    color: "#111111",
    letterSpacing: 0.4,
  },

  invoiceNumber: {
    marginTop: 6,
    fontSize: 10.5,
    color: "#6b7280",
  },

  status: {
    fontSize: 24,
    fontWeight: 700,
    textTransform: "uppercase",
  },

  statusPaid: {
    color: "#16a34a",
  },

  statusUnpaid: {
    color: "#dc2626",
  },

  statusPending: {
    color: "#d97706",
  },

  statusDraft: {
    color: "#6b7280",
  },

  twoColumn: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 28,
  },

  column: {
    width: "47%",
  },

  sectionLabel: {
    fontSize: 10.5,
    fontWeight: 700,
    color: "#111111",
    textTransform: "uppercase",
    marginBottom: 10,
    letterSpacing: 0.4,
  },

  textLine: {
    fontSize: 11,
    color: "#374151",
    marginBottom: 6,
    lineHeight: 1.45,
  },

  strongLine: {
    fontSize: 11,
    color: "#111111",
    fontWeight: 700,
    marginBottom: 6,
    lineHeight: 1.45,
  },

  detailsCard: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 8,
    padding: 14,
    marginBottom: 26,
  },

  detailsGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
  },

  detailsColumn: {
    width: "48%",
  },

  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },

  detailLabel: {
    width: "44%",
    fontSize: 10.5,
    color: "#6b7280",
  },

  detailValue: {
    width: "54%",
    fontSize: 10.5,
    color: "#111111",
    textAlign: "left",
  },

  table: {
    borderWidth: 1,
    borderColor: "#dbe1ea",
    marginBottom: 20,
  },

  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f8fafc",
    borderBottomWidth: 1,
    borderBottomColor: "#dbe1ea",
  },

  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },

  lastTableRow: {
    borderBottomWidth: 0,
  },

  colQty: {
    width: "10%",
    paddingHorizontal: 10,
    paddingVertical: 11,
  },

  colService: {
    width: "34%",
    paddingHorizontal: 10,
    paddingVertical: 11,
    borderLeftWidth: 1,
    borderLeftColor: "#e5e7eb",
  },

  colDescription: {
    width: "36%",
    paddingHorizontal: 10,
    paddingVertical: 11,
    borderLeftWidth: 1,
    borderLeftColor: "#e5e7eb",
  },

  colAmount: {
    width: "20%",
    paddingHorizontal: 10,
    paddingVertical: 11,
    borderLeftWidth: 1,
    borderLeftColor: "#e5e7eb",
    textAlign: "right",
  },

  headerCell: {
    fontSize: 10.5,
    fontWeight: 700,
    color: "#64748b",
    textTransform: "uppercase",
  },

  bodyCell: {
    fontSize: 10.5,
    color: "#111111",
    lineHeight: 1.4,
  },

  bodyMuted: {
    fontSize: 10,
    color: "#6b7280",
    marginTop: 3,
    lineHeight: 1.35,
  },

  amountCell: {
    fontSize: 10.5,
    color: "#111111",
    textAlign: "right",
  },

  totalsWrap: {
    alignItems: "flex-end",
    marginBottom: 22,
  },

  totalsBox: {
    width: 240,
  },

  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
  },

  totalLabel: {
    fontSize: 11,
    color: "#374151",
  },

  totalValue: {
    fontSize: 11,
    color: "#111111",
    fontWeight: 600,
  },

  grandTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 10,
    marginTop: 6,
    borderTopWidth: 1,
    borderTopColor: "#d1d5db",
  },

  grandTotalLabel: {
    fontSize: 13,
    fontWeight: 700,
    color: "#111111",
  },

  grandTotalValue: {
    fontSize: 13,
    fontWeight: 700,
    color: "#111111",
  },

  notesBox: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 8,
    padding: 14,
    marginBottom: 26,
  },

  noteText: {
    fontSize: 10.5,
    color: "#374151",
    lineHeight: 1.55,
  },

  footer: {
    marginTop: "auto",
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    flexDirection: "row",
    justifyContent: "flex-end",
  },

  footerText: {
    fontSize: 9.5,
    color: "#6b7280",
  },
});

function formatMoney(
  amountCents: number,
  currency: string
) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || "USD",
  }).format((amountCents || 0) / 100);
}

function formatDate(
  value: string | null
) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

function formatStatus(
  status: string
) {
  if (!status) {
    return "UNPAID";
  }

  return status.replace(/_/g, " ").toUpperCase();
}

function getStatusStyle(
  status: string
) {
  const normalized =
    status.toLowerCase();

  if (
    normalized === "paid"
  ) {
    return styles.statusPaid;
  }

  if (
    normalized === "unpaid" ||
    normalized === "overdue"
  ) {
    return styles.statusUnpaid;
  }

  if (
    normalized === "pending" ||
    normalized === "processing"
  ) {
    return styles.statusPending;
  }

  return styles.statusDraft;
}

function buildLogoUrl() {
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    "http://localhost:3000";

  return `${siteUrl.replace(/\/$/, "")}/logo.webp`;
}

export default function InvoicePdfDocument({
  invoice,
}: {
  invoice: InvoicePdfData;
}) {
  const logoUrl =
    buildLogoUrl();

  const hasDiscount =
    Number(invoice.discount_cents || 0) > 0;

  const hasTax =
    Number(invoice.tax_cents || 0) > 0;

  const hasNotes =
    Boolean(
      invoice.notes &&
        invoice.notes.trim()
    );

  return (
    <Document
      title={invoice.invoice_number}
      author="Embernix"
      subject="Invoice"
    >
      <Page
        size="A4"
        style={styles.page}
      >
        <View style={styles.header}>
          <Image
            src={logoUrl}
            style={styles.logo}
          />

          <Text style={styles.brand}>
            Embernix
          </Text>
        </View>

        <View style={styles.titleRow}>
          <View>
            <Text style={styles.invoiceTitle}>
              INVOICE
            </Text>

            <Text style={styles.invoiceNumber}>
              {invoice.invoice_number}
            </Text>
          </View>

          <Text
            style={[
              styles.status,
              getStatusStyle(
                invoice.status
              ),
            ]}
          >
            {formatStatus(
              invoice.status
            )}
          </Text>
        </View>

        <View style={styles.twoColumn}>
          <View style={styles.column}>
            <Text style={styles.sectionLabel}>
              Bill From
            </Text>

            <Text style={styles.strongLine}>
              Embernix
            </Text>

            <Text style={styles.textLine}>
              support@embernix.org
            </Text>
          </View>

          <View style={styles.column}>
            <Text style={styles.sectionLabel}>
              Bill To
            </Text>

            <Text style={styles.strongLine}>
              {invoice.customer_name}
            </Text>

            <Text style={styles.textLine}>
              {invoice.customer_email}
            </Text>
          </View>
        </View>

        <View style={styles.detailsCard}>
          <Text style={styles.sectionLabel}>
            Payment Details
          </Text>

          <View style={styles.detailsGrid}>
            <View style={styles.detailsColumn}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>
                  Date
                </Text>

                <Text style={styles.detailValue}>
                  {formatDate(
                    invoice.issued_at
                  )}
                </Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>
                  Due Date
                </Text>

                <Text style={styles.detailValue}>
                  {formatDate(
                    invoice.due_at
                  )}
                </Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>
                  Currency
                </Text>

                <Text style={styles.detailValue}>
                  {invoice.currency}
                </Text>
              </View>
            </View>

            <View style={styles.detailsColumn}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>
                  Paid Date
                </Text>

                <Text style={styles.detailValue}>
                  {formatDate(
                    invoice.paid_at
                  )}
                </Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>
                  Provider
                </Text>

                <Text style={styles.detailValue}>
                  {invoice.payment_provider
                    ? invoice.payment_provider.toUpperCase()
                    : "—"}
                </Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>
                  Transaction
                </Text>

                <Text style={styles.detailValue}>
                  {invoice.paddle_transaction_id ||
                    "—"}
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <View style={styles.colQty}>
              <Text
                style={
                  styles.headerCell
                }
              >
                Qty
              </Text>
            </View>

            <View style={styles.colService}>
              <Text
                style={
                  styles.headerCell
                }
              >
                Service
              </Text>
            </View>

            <View
              style={
                styles.colDescription
              }
            >
              <Text
                style={
                  styles.headerCell
                }
              >
                Description
              </Text>
            </View>

            <View style={styles.colAmount}>
              <Text
                style={[
                  styles.headerCell,
                  {
                    textAlign:
                      "right",
                  },
                ]}
              >
                Amount
              </Text>
            </View>
          </View>

          {invoice.items.map(
            (
              item,
              index
            ) => (
             <View
  key={item.id}
  style={[
    styles.tableRow,
    index === invoice.items.length - 1
      ? styles.lastTableRow
      : undefined,
  ]}
>
                <View
                  style={
                    styles.colQty
                  }
                >
                  <Text
                    style={
                      styles.bodyCell
                    }
                  >
                    {item.quantity}x
                  </Text>
                </View>

                <View
                  style={
                    styles.colService
                  }
                >
                  <Text
                    style={[
                      styles.bodyCell,
                      {
                        fontWeight: 700,
                      },
                    ]}
                  >
                    {item.title}
                  </Text>
                </View>

                <View
                  style={
                    styles.colDescription
                  }
                >
                  <Text
                    style={
                      styles.bodyCell
                    }
                  >
                    {item.description ||
                      "—"}
                  </Text>
                </View>

                <View
                  style={
                    styles.colAmount
                  }
                >
                  <Text
                    style={
                      styles.amountCell
                    }
                  >
                    {formatMoney(
                      item.line_total_cents,
                      invoice.currency
                    )}
                  </Text>
                </View>
              </View>
            )
          )}
        </View>

        <View style={styles.totalsWrap}>
          <View style={styles.totalsBox}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>
                Subtotal
              </Text>

              <Text style={styles.totalValue}>
                {formatMoney(
                  invoice.subtotal_cents,
                  invoice.currency
                )}
              </Text>
            </View>

            {hasDiscount && (
              <View
                style={
                  styles.totalRow
                }
              >
                <Text
                  style={
                    styles.totalLabel
                  }
                >
                  Discount
                </Text>

                <Text
                  style={
                    styles.totalValue
                  }
                >
                  -{" "}
                  {formatMoney(
                    invoice.discount_cents,
                    invoice.currency
                  )}
                </Text>
              </View>
            )}

            {hasTax && (
              <View
                style={
                  styles.totalRow
                }
              >
                <Text
                  style={
                    styles.totalLabel
                  }
                >
                  Tax
                </Text>

                <Text
                  style={
                    styles.totalValue
                  }
                >
                  {formatMoney(
                    invoice.tax_cents,
                    invoice.currency
                  )}
                </Text>
              </View>
            )}

            <View
              style={
                styles.grandTotalRow
              }
            >
              <Text
                style={
                  styles.grandTotalLabel
                }
              >
                Total
              </Text>

              <Text
                style={
                  styles.grandTotalValue
                }
              >
                {formatMoney(
                  invoice.total_cents,
                  invoice.currency
                )}
              </Text>
            </View>
          </View>
        </View>

        {hasNotes && (
          <View style={styles.notesBox}>
            <Text style={styles.sectionLabel}>
              Notes
            </Text>

            <Text style={styles.noteText}>
              {invoice.notes?.trim()}
            </Text>
          </View>
        )}

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            All rights reserved.
          </Text>
        </View>
      </Page>
    </Document>
  );
}