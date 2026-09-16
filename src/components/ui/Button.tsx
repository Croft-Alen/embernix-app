import Link from "next/link";

import {
  Loader2,
} from "lucide-react";

import type {
  ButtonHTMLAttributes,
  ReactNode,
} from "react";

type ButtonVariant =
  | "primary"
  | "secondary"
  | "danger"
  | "ghost";

type ButtonSize =
  | "sm"
  | "md";

type CommonProps = {
  children: ReactNode;

  variant?: ButtonVariant;

  size?: ButtonSize;

  icon?: ReactNode;

  loading?: boolean;

  className?: string;

  fullWidth?: boolean;
};

type ButtonElementProps =
  CommonProps &
  ButtonHTMLAttributes<HTMLButtonElement> & {
    href?: never;
  };

type LinkElementProps =
  CommonProps & {
    href: string;

    external?: boolean;

    target?: string;

    rel?: string;
  };

type ButtonProps =
  | ButtonElementProps
  | LinkElementProps;

export default function Button(
  props: ButtonProps
) {
  const {
    children,
    variant = "primary",
    size = "md",
    icon,
    loading = false,
    className = "",
    fullWidth = false,
  } = props;

  const baseClasses = [
    "inline-flex",
    "items-center",
    "justify-center",
    "rounded-xl",
    "font-medium",
    "transition-colors",
    "disabled:pointer-events-none",
    "disabled:opacity-50",
    fullWidth
      ? "w-full"
      : "",
  ]
    .filter(Boolean)
    .join(" ");

  const sizeClasses =
    size === "sm"
      ? "h-9 gap-2 px-3 text-xs"
      : "h-10 gap-2 px-4 text-sm";

  const variantClasses =
    variant === "primary"
      ? "bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)]"
      : variant === "secondary"
        ? "border border-[var(--border)] bg-white text-[var(--foreground)] hover:bg-[var(--surface-hover)]"
        : variant === "danger"
          ? "border border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
          : "bg-transparent text-[var(--foreground)] hover:bg-[var(--surface-hover)]";

  const classes = `
    ${baseClasses}
    ${sizeClasses}
    ${variantClasses}
    ${className}
  `;

  const content =
    loading ? (
      <Loader2
        className="h-4 w-4 animate-spin"
      />
    ) : (
      <>
        {icon && (
          <span className="flex shrink-0 items-center justify-center">
            {icon}
          </span>
        )}

        <span className="whitespace-nowrap">
          {children}
        </span>
      </>
    );

  if (
    "href" in props &&
    props.href
  ) {
    const {
      href,
      external = false,
      target,
      rel,
    } = props;

    if (external) {
      return (
        <a
          href={href}
          target={
            target ??
            "_blank"
          }
          rel={
            rel ??
            "noreferrer"
          }
          className={
            classes
          }
        >
          {content}
        </a>
      );
    }

    return (
      <Link
        href={href}
        className={
          classes
        }
      >
        {content}
      </Link>
    );
  }

  const {
    type = "button",
    disabled,
    ...buttonProps
  } =
    props as ButtonElementProps;

  return (
    <button
      {...buttonProps}
      type={type}
      disabled={
        disabled ||
        loading
      }
      className={
        classes
      }
    >
      {content}
    </button>
  );
}