"use client";

import {
  useState,
} from "react";

import {
  useRouter,
} from "next/navigation";

import TicketComposer from "@/components/tickets/TicketComposer";

type Option = {
  id: string;
  name: string;
};

type ProductOption = {
  id: string;
  name: string;
};

type NewTicketFormProps = {
  topics: Option[];

  priorities: Option[];

  products: ProductOption[];
};

export default function NewTicketForm({
  topics,
  priorities,
  products,
}: NewTicketFormProps) {
  const router =
    useRouter();

  const [
    subject,
    setSubject,
  ] = useState("");

  const [
    topicId,
    setTopicId,
  ] = useState("");

  const [
    priorityId,
    setPriorityId,
  ] = useState("");

  const [
    productId,
    setProductId,
  ] = useState("");

  async function createTicket(
    message: string,
    files: File[]
  ) {
    if (
      subject.trim().length <
      3
    ) {
      throw new Error(
        "Please enter a subject."
      );
    }

    if (
      !topicId
    ) {
      throw new Error(
        "Please select a topic."
      );
    }

    if (
      !priorityId
    ) {
      throw new Error(
        "Please select a priority."
      );
    }

    const formData =
      new FormData();

    formData.set(
      "subject",
      subject.trim()
    );

    formData.set(
      "topicId",
      topicId
    );

    formData.set(
      "priorityId",
      priorityId
    );

    formData.set(
      "productId",
      productId
    );

    formData.set(
      "message",
      message
    );

    for (
      const file
      of files
    ) {
      formData.append(
        "files",
        file
      );
    }

    const response =
      await fetch(
        "/api/tickets",
        {
          method:
            "POST",

          body:
            formData,
        }
      );

    const result =
      await response.json();

    if (
      !response.ok
    ) {
      throw new Error(
        result.error ||
          "Unable to create ticket."
      );
    }

    router.push(
      `/tickets/${result.ticketId}`
    );
  }

  return (
    <section className="overflow-visible rounded-[22px] border border-[var(--border)] bg-[var(--surface)]">
      <div className="space-y-5 p-5 sm:p-7">
        <div>
          <label className="mb-2 block text-sm font-medium text-[var(--foreground)]">
            Subject
          </label>

          <input
            value={
              subject
            }
            onChange={(
              event
            ) =>
              setSubject(
                event.target
                  .value
              )
            }
            maxLength={
              160
            }
            placeholder="What do you need help with?"
            className="h-11 w-full rounded-xl border border-[var(--border)] bg-white px-3.5 text-sm outline-none placeholder:text-[var(--muted-light)] focus:border-[var(--primary)]"
          />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-[var(--foreground)]">
              Topic
            </label>

            <select
              value={
                topicId
              }
              onChange={(
                event
              ) =>
                setTopicId(
                  event.target
                    .value
                )
              }
              className="h-11 w-full rounded-xl border border-[var(--border)] bg-white px-3 text-sm outline-none focus:border-[var(--primary)]"
            >
              <option value="">
                Select topic
              </option>

              {topics.map(
                (
                  topic
                ) => (
                  <option
                    key={
                      topic.id
                    }
                    value={
                      topic.id
                    }
                  >
                    {
                      topic.name
                    }
                  </option>
                )
              )}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-[var(--foreground)]">
              Priority
            </label>

            <select
              value={
                priorityId
              }
              onChange={(
                event
              ) =>
                setPriorityId(
                  event.target
                    .value
                )
              }
              className="h-11 w-full rounded-xl border border-[var(--border)] bg-white px-3 text-sm outline-none focus:border-[var(--primary)]"
            >
              <option value="">
                Select priority
              </option>

              {priorities.map(
                (
                  priority
                ) => (
                  <option
                    key={
                      priority.id
                    }
                    value={
                      priority.id
                    }
                  >
                    {
                      priority.name
                    }
                  </option>
                )
              )}
            </select>
          </div>
        </div>

        {products.length >
          0 && (
          <div>
            <label className="mb-2 block text-sm font-medium text-[var(--foreground)]">
              Product
            </label>

            <select
              value={
                productId
              }
              onChange={(
                event
              ) =>
                setProductId(
                  event.target
                    .value
                )
              }
              className="h-11 w-full rounded-xl border border-[var(--border)] bg-white px-3 text-sm outline-none focus:border-[var(--primary)]"
            >
              <option value="">
                No product selected
              </option>

              {products.map(
                (
                  product
                ) => (
                  <option
                    key={
                      product.id
                    }
                    value={
                      product.id
                    }
                  >
                    {
                      product.name
                    }
                  </option>
                )
              )}
            </select>
          </div>
        )}
      </div>

      <div className="border-t border-[var(--border-light)] p-4 sm:p-5">
        <div className="mb-3">
          <p className="text-sm font-semibold text-[var(--foreground)]">
            Start the conversation
          </p>

          <p className="mt-1 text-xs text-[var(--muted)]">
            Describe the issue and attach any useful screenshots or files.
          </p>
        </div>

        <TicketComposer
          placeholder="Describe what you need help with..."
          onSend={
            createTicket
          }
        />
      </div>
    </section>
  );
}