import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useHotkeys } from "react-hotkeys-hook";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  IconLayoutDashboard,
  IconChecklist,
  IconClock,
  IconMessageCircle,
  IconSettings,
  IconUser,
  IconPlus,
  IconPlayerPlay,
} from "@tabler/icons-react";

const navItems = [
  { label: "Dashboard",  path: "/dashboard", icon: IconLayoutDashboard },
  { label: "Tasks",      path: "/tasks",      icon: IconChecklist       },
  { label: "Sessions",   path: "/sessions",   icon: IconClock           },
  { label: "Chat",       path: "/chat",       icon: IconMessageCircle   },
  { label: "Settings",   path: "/settings",   icon: IconSettings        },
  { label: "Profile",    path: "/profile",    icon: IconUser            },
];

const actionItems = [
  { label: "Create Task",    icon: IconPlus,         action: "createTask"    },
  { label: "Start Session",  icon: IconPlayerPlay,   action: "startSession"  },
];

const CommandPalette = () => {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  useHotkeys(
    ["meta+k", "ctrl+k"],
    (e) => {
      e.preventDefault();
      setOpen((o) => !o);
    },
    { enableOnFormTags: false }
  );

  const handleNav = (path: string) => {
    navigate(path);
    setOpen(false);
  };

  const handleAction = (action: string) => {
    setOpen(false);
    if (action === "createTask") navigate("/tasks");
    if (action === "startSession") navigate("/sessions");
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Search pages or actions…" />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        <CommandGroup heading="Navigate">
          {navItems.map((item) => (
            <CommandItem
              key={item.path}
              onSelect={() => handleNav(item.path)}
              className="flex items-center gap-2 cursor-pointer"
            >
              <item.icon size={16} stroke={1.75} className="text-muted-foreground" />
              <span>{item.label}</span>
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandGroup heading="Actions">
          {actionItems.map((item) => (
            <CommandItem
              key={item.action}
              onSelect={() => handleAction(item.action)}
              className="flex items-center gap-2 cursor-pointer"
            >
              <item.icon size={16} stroke={1.75} className="text-muted-foreground" />
              <span>{item.label}</span>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
};

export default CommandPalette;
