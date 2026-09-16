"use client";

import {
  File,
  Link2,
  LoaderCircle,
  Paperclip,
  Send,
  Upload,
  X,
} from "lucide-react";

import {
  useRouter,
} from "next/navigation";

import {
  useMemo,
  useRef,
  useState,
} from "react";

import {
  createClient,
} from "@/lib/supabase/client";

type ProjectRequirementsFormProps = {
  projectId: string;
};

type UploadedAttachment = {
  path: string;
  fileName: string;
  fileType: string;
  fileSize: number;

  kind:
    | "reference"
    | "project_file";
};

type SignedUpload = {
  path: string;
  token: string;
  fileName: string;
  fileType: string;
  fileSize: number;
};

function formatFileSize(
  bytes: number
) {
  if (
    bytes <
    1024
  ) {
    return `${bytes} B`;
  }

  if (
    bytes <
    1024 * 1024
  ) {
    return `${(
      bytes /
      1024
    ).toFixed(1)} KB`;
  }

  return `${(
    bytes /
    1024 /
    1024
  ).toFixed(1)} MB`;
}

export default function ProjectRequirementsForm({
  projectId,
}: ProjectRequirementsFormProps) {
  const router =
    useRouter();

  const [
    description,
    setDescription,
  ] = useState("");

  const [
    referenceUrls,
    setReferenceUrls,
  ] = useState("");

  const [
    additionalNotes,
    setAdditionalNotes,
  ] = useState("");

  const [
    referenceFiles,
    setReferenceFiles,
  ] = useState<File[]>(
    []
  );

  const [
    projectFiles,
    setProjectFiles,
  ] = useState<File[]>(
    []
  );

  const [
    submitting,
    setSubmitting,
  ] = useState(false);

  const [
    error,
    setError,
  ] =
    useState<string | null>(
      null
    );

  const referenceInputRef =
    useRef<HTMLInputElement>(
      null
    );

  const projectInputRef =
    useRef<HTMLInputElement>(
      null
    );

  const totalFiles =
    referenceFiles.length +
    projectFiles.length;

  const totalSize =
    useMemo(
      () =>
        [
          ...referenceFiles,
          ...projectFiles,
        ].reduce(
          (
            sum,
            file
          ) =>
            sum +
            file.size,
          0
        ),
      [
        referenceFiles,
        projectFiles,
      ]
    );

  async function uploadFiles(
    files: File[],
    purpose:
      | "requirements-reference"
      | "requirements-project",
    kind:
      | "reference"
      | "project_file"
  ): Promise<
    UploadedAttachment[]
  > {
    if (
      files.length ===
      0
    ) {
      return [];
    }

    const signResponse =
      await fetch(
        `/api/projects/${projectId}/uploads/sign`,
        {
          method:
            "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body:
            JSON.stringify({
              purpose,

              files:
                files.map(
                  (
                    file
                  ) => ({
                    name:
                      file.name,

                    type:
                      file.type,

                    size:
                      file.size,
                  })
                ),
            }),
        }
      );

    const signData =
      (await signResponse.json()) as {
        uploads?: SignedUpload[];
        error?: string;
      };

    if (
      !signResponse.ok ||
      !signData.uploads
    ) {
      throw new Error(
        signData.error ||
          "Unable to prepare file uploads."
      );
    }

    const supabase =
      createClient();

    const uploaded: UploadedAttachment[] =
      [];

    for (
      let index = 0;
      index <
      signData.uploads
        .length;
      index++
    ) {
      const signed =
        signData.uploads[
          index
        ];

      const file =
        files[index];

      const {
        error:
          uploadError,
      } =
        await supabase.storage
          .from(
            "project-files"
          )
          .uploadToSignedUrl(
            signed.path,
            signed.token,
            file,
            {
              contentType:
                file.type ||
                "application/octet-stream",
            }
          );

      if (uploadError) {
        throw new Error(
          `Unable to upload ${file.name}.`
        );
      }

      uploaded.push({
        path:
          signed.path,

        fileName:
          file.name,

        fileType:
          file.type ||
          "application/octet-stream",

        fileSize:
          file.size,

        kind,
      });
    }

    return uploaded;
  }

  async function handleSubmit() {
    if (
      submitting
    ) {
      return;
    }

    if (
      !description.trim()
    ) {
      setError(
        "Please describe your project requirements."
      );

      return;
    }

    if (
      totalFiles >
      20
    ) {
      setError(
        "You can attach up to 20 files in total."
      );

      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const [
        uploadedReferences,
        uploadedProjectFiles,
      ] =
        await Promise.all([
          uploadFiles(
            referenceFiles,
            "requirements-reference",
            "reference"
          ),

          uploadFiles(
            projectFiles,
            "requirements-project",
            "project_file"
          ),
        ]);

      const urls =
        referenceUrls
          .split(
            /\r?\n|,/
          )
          .map(
            (
              value
            ) =>
              value.trim()
          )
          .filter(
            Boolean
          );

      const response =
        await fetch(
          `/api/projects/${projectId}/requirements`,
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                description:
                  description.trim(),

                referenceUrls:
                  urls,

                additionalNotes:
                  additionalNotes.trim(),

                attachments: [
                  ...uploadedReferences,
                  ...uploadedProjectFiles,
                ],
              }),
          }
        );

      const data =
        (await response.json()) as {
          success?: boolean;
          error?: string;
        };

      if (
        !response.ok ||
        !data.success
      ) {
        throw new Error(
          data.error ||
            "Unable to submit requirements."
        );
      }

      router.refresh();
    } catch (
      submissionError
    ) {
      console.error(
        "Requirements submission failed:",
        submissionError
      );

      setError(
        submissionError instanceof
          Error
          ? submissionError.message
          : "Unable to submit requirements."
      );

      setSubmitting(false);
    }
  }

  function removeReferenceFile(
    index: number
  ) {
    setReferenceFiles(
      (
        current
      ) =>
        current.filter(
          (
            _,
            currentIndex
          ) =>
            currentIndex !==
            index
        )
    );
  }

  function removeProjectFile(
    index: number
  ) {
    setProjectFiles(
      (
        current
      ) =>
        current.filter(
          (
            _,
            currentIndex
          ) =>
            currentIndex !==
            index
        )
    );
  }

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-white">
      <div className="border-b border-[var(--border-light)] p-6">
        <h2 className="text-lg font-semibold">
          Project requirements
        </h2>

        <p className="mt-1 text-sm text-[var(--muted)]">
          Give us everything we need to start your project.
          Your submitted requirements will be preserved as the
          original project brief.
        </p>
      </div>

      <div className="space-y-7 p-6">
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div>
          <label className="block text-sm font-semibold">
            Requirements description
            <span className="ml-1 text-red-500">
              *
            </span>
          </label>

          <p className="mt-1 text-xs text-[var(--muted)]">
            Describe what you need, expected features, behavior,
            design preferences, versions, platforms, or anything
            important for the project.
          </p>

          <textarea
            value={
              description
            }
            onChange={(
              event
            ) =>
              setDescription(
                event.target
                  .value
              )
            }
            rows={10}
            placeholder="Describe your project in detail..."
            className="mt-3 w-full resize-y rounded-xl border border-[var(--border)] bg-white px-4 py-3 text-sm leading-6 outline-none transition-colors focus:border-[var(--primary)]"
          />
        </div>

        <div>
          <div className="flex items-center gap-2">
            <Link2 className="h-4 w-4 text-[var(--muted)]" />

            <label className="text-sm font-semibold">
              Reference URLs
            </label>
          </div>

          <p className="mt-1 text-xs text-[var(--muted)]">
            Add websites, examples, documentation, designs, videos,
            repositories, or other references. Put one link per line.
          </p>

          <textarea
            value={
              referenceUrls
            }
            onChange={(
              event
            ) =>
              setReferenceUrls(
                event.target
                  .value
              )
            }
            rows={4}
            placeholder={`https://example.com/reference\nhttps://github.com/example/project`}
            className="mt-3 w-full resize-y rounded-xl border border-[var(--border)] bg-white px-4 py-3 text-sm leading-6 outline-none transition-colors focus:border-[var(--primary)]"
          />
        </div>

        <div>
          <div className="flex items-center gap-2">
            <Paperclip className="h-4 w-4 text-[var(--muted)]" />

            <label className="text-sm font-semibold">
              Reference files
            </label>
          </div>

          <p className="mt-1 text-xs text-[var(--muted)]">
            Upload screenshots, PDFs, examples, documents, ZIP files,
            or anything we should use as a reference.
          </p>

          <input
            ref={
              referenceInputRef
            }
            type="file"
            multiple
            className="hidden"
            onChange={(
              event
            ) => {
              const selected =
                Array.from(
                  event.target
                    .files ??
                    []
                );

              setReferenceFiles(
                (
                  current
                ) => [
                  ...current,
                  ...selected,
                ].slice(
                  0,
                  10
                )
              );

              event.target.value =
                "";
            }}
          />

          <button
            type="button"
            onClick={() =>
              referenceInputRef.current?.click()
            }
            className="mt-3 flex min-h-[110px] w-full flex-col items-center justify-center rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface-secondary)] px-4 text-center transition-colors hover:border-[var(--primary)]"
          >
            <Upload className="h-5 w-5 text-[var(--primary)]" />

            <span className="mt-2 text-sm font-medium">
              Upload reference files
            </span>

            <span className="mt-1 text-xs text-[var(--muted)]">
              Up to 10 files · 50 MB each
            </span>
          </button>

          {referenceFiles.length >
            0 && (
            <div className="mt-3 space-y-2">
              {referenceFiles.map(
                (
                  file,
                  index
                ) => (
                  <div
                    key={`${file.name}-${file.lastModified}-${index}`}
                    className="flex items-center gap-3 rounded-xl border border-[var(--border-light)] px-3 py-2.5"
                  >
                    <File className="h-4 w-4 shrink-0 text-[var(--muted)]" />

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {file.name}
                      </p>

                      <p className="text-xs text-[var(--muted)]">
                        {formatFileSize(
                          file.size
                        )}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        removeReferenceFile(
                          index
                        )
                      }
                      className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-[var(--surface-secondary)]"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )
              )}
            </div>
          )}
        </div>

        <div>
          <div className="flex items-center gap-2">
            <Paperclip className="h-4 w-4 text-[var(--muted)]" />

            <label className="text-sm font-semibold">
              Project files / assets
            </label>
          </div>

          <p className="mt-1 text-xs text-[var(--muted)]">
            Upload files we actually need to work with, such as
            logos, source files, existing code, assets, content,
            configurations, or project data.
          </p>

          <input
            ref={
              projectInputRef
            }
            type="file"
            multiple
            className="hidden"
            onChange={(
              event
            ) => {
              const selected =
                Array.from(
                  event.target
                    .files ??
                    []
                );

              setProjectFiles(
                (
                  current
                ) => [
                  ...current,
                  ...selected,
                ].slice(
                  0,
                  10
                )
              );

              event.target.value =
                "";
            }}
          />

          <button
            type="button"
            onClick={() =>
              projectInputRef.current?.click()
            }
            className="mt-3 flex min-h-[110px] w-full flex-col items-center justify-center rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface-secondary)] px-4 text-center transition-colors hover:border-[var(--primary)]"
          >
            <Upload className="h-5 w-5 text-[var(--primary)]" />

            <span className="mt-2 text-sm font-medium">
              Upload project files
            </span>

            <span className="mt-1 text-xs text-[var(--muted)]">
              Up to 10 files · 50 MB each
            </span>
          </button>

          {projectFiles.length >
            0 && (
            <div className="mt-3 space-y-2">
              {projectFiles.map(
                (
                  file,
                  index
                ) => (
                  <div
                    key={`${file.name}-${file.lastModified}-${index}`}
                    className="flex items-center gap-3 rounded-xl border border-[var(--border-light)] px-3 py-2.5"
                  >
                    <File className="h-4 w-4 shrink-0 text-[var(--muted)]" />

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {file.name}
                      </p>

                      <p className="text-xs text-[var(--muted)]">
                        {formatFileSize(
                          file.size
                        )}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        removeProjectFile(
                          index
                        )
                      }
                      className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-[var(--surface-secondary)]"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )
              )}
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-semibold">
            Additional notes
          </label>

          <p className="mt-1 text-xs text-[var(--muted)]">
            Anything else you want the Embernix team to know.
          </p>

          <textarea
            value={
              additionalNotes
            }
            onChange={(
              event
            ) =>
              setAdditionalNotes(
                event.target
                  .value
              )
            }
            rows={5}
            placeholder="Optional additional notes..."
            className="mt-3 w-full resize-y rounded-xl border border-[var(--border)] bg-white px-4 py-3 text-sm leading-6 outline-none transition-colors focus:border-[var(--primary)]"
          />
        </div>

        <div className="flex flex-col gap-4 border-t border-[var(--border-light)] pt-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-xs text-[var(--muted)]">
            {totalFiles >
            0 ? (
              <>
                {totalFiles} file
                {totalFiles ===
                1
                  ? ""
                  : "s"}{" "}
                ·{" "}
                {formatFileSize(
                  totalSize
                )}
              </>
            ) : (
              "Attachments are optional."
            )}
          </div>

          <button
            type="button"
            disabled={
              submitting
            }
            onClick={
              handleSubmit
            }
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-5 text-sm font-semibold text-white transition-colors hover:bg-[var(--primary-hover)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? (
              <>
                <LoaderCircle className="h-4 w-4 animate-spin" />

                Submitting...
              </>
            ) : (
              <>
                Submit requirements

                <Send className="h-4 w-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}