import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Camera, Upload, Compass } from "lucide-react";
import FeatureCard from "./FeatureCard";

// import scanMealImg from "../../assets/cards/scan-meal.png";
// import uploadIngredientsImg from "../../assets/cards/upload-ingredients.png";
// import discoverImg from "../../assets/cards/discover-superfoods.png";

const list = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.15,
    },
  },
};

const CARDS = [
  {
    id: "scan-meal",
    title: "Scan a Recipe",
    description: "Snap a photo and get an AI curated healthier version in seconds",
    cta: "Scan Recipe",
    icon: Camera,
    bg: "#FB8D02",
    image:
      "https://images.unsplash.com/photo-1547592180-85f173990554?w=400&auto=format&fit=crop",
    to: "/scan",
  },
  {
    id: "ingredients",
    title: "Create From Ingredients",
    description: "Tell us what's in your kitchen, we'll build a healthy recipe",
    cta: "Create Recipe From Ingredients",
    icon: Upload,
    bg: "#0A8B86",
    image:
      "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&auto=format&fit=crop",
    to: "/create",
    mode: "ingredients",
  },
  {
    id: "superfoods",
    title: "Cook With Superfoods",
    description: "Build everyday meals around chia, quinoa, millets & more",
    cta: "Cook With Superfoods",
    icon: Compass,
    bg: "#FB8D02",
    image:
      "https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=400&auto=format&fit=crop",
    to: "/create",
    mode: "superfoods",
  },
];

export default function FeatureCards() {
  const navigate = useNavigate();

  return (
    <motion.div
      variants={list}
      initial="hidden"
      animate="show"
      className="grid gap-5 lg:grid-cols-3 md:grid-cols-2 grid-cols-1"
    >
      {CARDS.map((card) => (
        <FeatureCard
          key={card.id}
          {...card}
          onAction={() => navigate(card.to, card.mode ? { state: { mode: card.mode } } : undefined)}
        />
      ))}
    </motion.div>
  );
}