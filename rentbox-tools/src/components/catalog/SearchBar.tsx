"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";

interface SearchBarProps {
  placeholder?: string;
  defaultValue?: string;
  basePath?: string;
}

export function SearchBar({
  placeholder = "Otsi tööriistu...",
  defaultValue = "",
  basePath = "/tooriistad",
}: SearchBarProps) {
  const router = useRouter();
  const [query, setQuery] = useState(defaultValue);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (query.trim()) {
        router.push(`${basePath}?q=${encodeURIComponent(query.trim())}`);
      } else {
        router.push(basePath);
      }
    },
    [query, basePath, router]
  );

  return (
    <form onSubmit={handleSubmit} className="relative w-full max-w-xl mx-auto">
      <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" />
      <Input
        type="search"
        placeholder={placeholder}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="h-12 pl-12 pr-24 text-base"
      />
      <Button
        type="submit"
        size="sm"
        className="absolute right-2 top-1/2 -translate-y-1/2"
      >
        Otsi
      </Button>
    </form>
  );
}
