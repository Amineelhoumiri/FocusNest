import * as React from "react";
import { cn } from "@/lib/utils";
import { CreditCard, FileText, LogOut, Settings, User } from "lucide-react";
import { Link } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface ProfileDropdownData {
  name: string;
  email: string;
  avatarUrl?: string | null;
  subscription?: string | null;
  model?: string | null;
}

interface MenuItem {
  label: string;
  value?: string | null;
  to?: string;
  href?: string;
  icon: React.ReactNode;
  external?: boolean;
}

const Gemini = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    height="1em"
    style={{ flex: "none", lineHeight: 1 }}
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
    width="1em"
    {...props}
  >
    <title>{"Gemini"}</title>
    <defs>
      <linearGradient id="lobe-icons-gemini-fill" x1="0%" x2="68.73%" y1="100%" y2="30.395%">
        <stop offset="0%" stopColor="#1C7DFF" />
        <stop offset="52.021%" stopColor="#1C69FF" />
        <stop offset="100%" stopColor="#F0DCD6" />
      </linearGradient>
    </defs>
    <path
      d="M12 24A14.304 14.304 0 000 12 14.304 14.304 0 0012 0a14.305 14.305 0 0012 12 14.305 14.305 0 00-12 12"
      fill="url(#lobe-icons-gemini-fill)"
      fillRule="nonzero"
    />
  </svg>
);

const FALLBACK_AVATAR =
  "https://images.unsplash.com/photo-1520975958225-1e8d571a1db9?auto=format&fit=crop&w=192&h=192&q=80";

export interface ProfileDropdownProps extends React.HTMLAttributes<HTMLDivElement> {
  data: ProfileDropdownData;
  onLogout: () => void | Promise<void>;
  variant?: "compact" | "wide";
}

export function ProfileDropdown({
  data,
  onLogout,
  variant = "wide",
  className,
  ...props
}: ProfileDropdownProps) {
  const [isOpen, setIsOpen] = React.useState(false);

  const menuItems: MenuItem[] = [
    { label: "Profile", to: "/profile", icon: <User className="h-4 w-4" /> },
    ...(data.model ? [{ label: "Model", value: data.model, href: "https://ai.google.dev/gemini-api", external: true, icon: <Gemini className="h-4 w-4" /> }] : []),
    ...(data.subscription
      ? [{ label: "Subscription", value: data.subscription, to: "/pricing", icon: <CreditCard className="h-4 w-4" /> }]
      : []),
    { label: "Settings", to: "/settings", icon: <Settings className="h-4 w-4" /> },
    { label: "Terms & Policies", to: "/terms", icon: <FileText className="h-4 w-4" /> },
  ];

  const avatarSrc = data.avatarUrl || FALLBACK_AVATAR;
  const initials = React.useMemo(() => {
    const name = (data.name || "U").trim();
    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    return (parts[0]?.[0] ?? "U").toUpperCase();
  }, [data.name]);

  return (
    <div className={cn("relative", className)} {...props}>
      <DropdownMenu onOpenChange={setIsOpen}>
        <div className="group relative">
          <DropdownMenuTrigger asChild>
            {variant === "wide" ? (
              <button
                type="button"
                className={cn(
                  "flex w-full items-center gap-10 rounded-2xl border p-3 text-left transition-all duration-200 focus:outline-none",
                  "border-border/60 bg-card/85 hover:border-primary/25 hover:bg-card/95 hover:shadow-sm"
                )}
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium tracking-tight text-foreground/90 leading-tight">
                    {data.name}
                  </div>
                  <div className="truncate text-xs tracking-tight text-muted-foreground/70 leading-tight">
                    {data.email}
                  </div>
                </div>

                <div className="relative shrink-0">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary via-fuchsia-500 to-rose-400 p-0.5">
                    <div className="h-full w-full overflow-hidden rounded-full bg-card">
                      <img
                        src={avatarSrc}
                        alt={data.name}
                        className="h-full w-full rounded-full object-cover"
                        loading="lazy"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  </div>
                </div>
              </button>
            ) : (
              <button
                type="button"
                aria-label="Open profile menu"
                className={cn(
                  "inline-flex h-[30px] w-[30px] items-center justify-center overflow-hidden rounded-full border transition-all duration-200 focus:outline-none",
                  "border-primary/20 bg-primary text-primary-foreground hover:brightness-110"
                )}
              >
                {data.avatarUrl ? (
                  <img
                    src={avatarSrc}
                    alt={data.name}
                    className="h-full w-full object-cover"
                    loading="lazy"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <span className="text-[11px] font-semibold">{initials}</span>
                )}
              </button>
            )}
          </DropdownMenuTrigger>

          {/* bending line indicator — hidden on xs to avoid clipping / horizontal squeeze next to other icons */}
          <div
            className={cn(
              "absolute -right-3 top-1/2 -translate-y-1/2 transition-all duration-200 hidden sm:block",
              isOpen ? "opacity-100" : "opacity-60 group-hover:opacity-100"
            )}
          >
            <svg
              width="12"
              height="24"
              viewBox="0 0 12 24"
              fill="none"
              className={cn(
                "transition-all duration-200",
                isOpen
                  ? "text-primary scale-110"
                  : "text-muted-foreground/50 group-hover:text-foreground/60"
              )}
              aria-hidden="true"
            >
              <path
                d="M2 4C6 8 6 16 2 20"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                fill="none"
              />
            </svg>
          </div>

          <DropdownMenuContent
            align="end"
            sideOffset={6}
            className={cn(
              "w-64 rounded-2xl border p-2 shadow-xl",
              "border-border/60 bg-card/95 backdrop-blur-xl",
              "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
              "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
              "data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
              "origin-top-right"
            )}
          >
            <div className="space-y-1">
              {menuItems.map((item) => (
                <DropdownMenuItem key={item.label} asChild>
                  {item.to ? (
                    <Link
                      to={item.to}
                      className={cn(
                        "flex items-center rounded-xl border border-transparent p-3 transition-all duration-200 cursor-pointer group",
                        "hover:bg-primary/5 hover:border-primary/15 hover:shadow-sm"
                      )}
                    >
                      <div className="flex flex-1 items-center gap-2">
                        <span className="text-foreground/70 group-hover:text-primary transition-colors">
                          {item.icon}
                        </span>
                        <span className="whitespace-nowrap text-sm font-medium tracking-tight text-foreground/90 group-hover:text-foreground">
                          {item.label}
                        </span>
                      </div>
                      {item.value && (
                        <span
                          className={cn(
                            "ml-auto rounded-md border px-2 py-1 text-xs font-medium tracking-tight",
                            item.label === "Model"
                              ? "border-sky-500/15 bg-sky-500/10 text-sky-600 dark:text-sky-400"
                              : "border-primary/15 bg-primary/10 text-primary"
                          )}
                        >
                          {item.value}
                        </span>
                      )}
                    </Link>
                  ) : (
                    <a
                      href={item.href ?? "#"}
                      target={item.external ? "_blank" : undefined}
                      rel={item.external ? "noreferrer" : undefined}
                      className={cn(
                        "flex items-center rounded-xl border border-transparent p-3 transition-all duration-200 cursor-pointer group",
                        "hover:bg-primary/5 hover:border-primary/15 hover:shadow-sm"
                      )}
                    >
                      <div className="flex flex-1 items-center gap-2">
                        <span className="text-foreground/70 group-hover:text-primary transition-colors">
                          {item.icon}
                        </span>
                        <span className="whitespace-nowrap text-sm font-medium tracking-tight text-foreground/90 group-hover:text-foreground">
                          {item.label}
                        </span>
                      </div>
                      {item.value && (
                        <span className="ml-auto rounded-md border border-primary/15 bg-primary/10 px-2 py-1 text-xs font-medium tracking-tight text-primary">
                          {item.value}
                        </span>
                      )}
                    </a>
                  )}
                </DropdownMenuItem>
              ))}
            </div>

            <DropdownMenuSeparator className="my-3 bg-gradient-to-r from-transparent via-border/70 to-transparent" />

            <DropdownMenuItem asChild>
              <button
                type="button"
                onClick={onLogout}
                className={cn(
                  "w-full flex items-center gap-3 rounded-xl border border-transparent p-3 transition-all duration-200 cursor-pointer group",
                  "bg-destructive/10 hover:bg-destructive/15 hover:border-destructive/30 hover:shadow-sm"
                )}
              >
                <LogOut className="h-4 w-4 text-destructive group-hover:text-destructive" />
                <span className="text-sm font-medium text-destructive">Sign Out</span>
              </button>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </div>
      </DropdownMenu>
    </div>
  );
}

