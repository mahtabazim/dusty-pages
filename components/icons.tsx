import {
  AlertTriangle,
  Award,
  BadgeCheck,
  Baby,
  Bell,
  Book,
  BookA,
  BookMarked,
  BookOpen,
  BookText,
  Brain,
  Coins,
  Compass,
  Gem,
  Globe2,
  GraduationCap,
  MessageCircle,
  Package,
  PartyPopper,
  PenLine,
  ShoppingBag,
  Sprout,
  Tag,
  Trophy,
  UserPlus,
  Zap,
  type LucideIcon,
} from "lucide-react";

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  fiction: BookText,
  "non-fiction": Brain,
  academic: GraduationCap,
  "competitive-exams": PenLine,
  "comics-manga": Zap,
  children: Baby,
  "self-help": Sprout,
  hindi: BookA,
  regional: Globe2,
  "rare-collectible": Gem,
};

export function CategoryIcon({
  slug,
  className,
}: {
  slug: string;
  className?: string;
}) {
  const Icon = CATEGORY_ICONS[slug] ?? Book;
  return <Icon className={className ?? "size-4"} aria-hidden />;
}

const BADGE_ICONS: Record<string, LucideIcon> = {
  first_listing: Tag,
  first_sale: PartyPopper,
  ten_books_sold: Trophy,
  first_purchase: ShoppingBag,
  genre_explorer: Compass,
  bookworm: BookMarked,
  trusted_seller: BadgeCheck,
};

export function BadgeIcon({
  code,
  className,
}: {
  code: string;
  className?: string;
}) {
  const Icon = BADGE_ICONS[code] ?? Award;
  return <Icon className={className ?? "size-3.5"} aria-hidden />;
}

const NOTIFICATION_ICONS: Record<string, LucideIcon> = {
  message: MessageCircle,
  offer: Tag,
  order: Package,
  coins: Coins,
  listing: BookOpen,
  follow: UserPlus,
  dispute: AlertTriangle,
  system: Bell,
};

export function NotificationIcon({
  type,
  className,
}: {
  type: string;
  className?: string;
}) {
  const Icon = NOTIFICATION_ICONS[type] ?? Bell;
  return <Icon className={className ?? "size-5"} aria-hidden />;
}
