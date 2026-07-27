import Logo from './Logo'
import NewRecipeButton from './NewRecipeButton'
import NavItem from './NavItem'
import RecentRecipes from './RecentRecipes'
import UserProfile from './UserProfile'
import { sidebarLinks } from '../../data/navigation'

/**
 * The fixed left sidebar. Internally scrollable so long content (recent
 * recipes) never pushes the profile card out of view. The header (logo +
 * New Recipe) and footer (profile) stay pinned while the middle scrolls.
 *
 * @param {() => void} [onNavigate] - called when a link is tapped (closes the
 *   mobile drawer).
 */
export default function Sidebar({ onNavigate }) {
  return (
    <div className="flex h-full flex-col bg-cream-100">
      {/* Header — logo + primary CTA (pinned) */}
      <div className="shrink-0 space-y-4 px-5 pb-4 pt-6">
        <Logo />
        <NewRecipeButton />
      </div>

      {/* Scrollable middle: nav + recent recipes */}
      <nav className="min-h-0 flex-1 space-y-6 overflow-y-auto px-4 pb-4">
        <ul className="space-y-1">
          {sidebarLinks.map((link) => (
            <li key={link.label}>
              <NavItem {...link} onNavigate={onNavigate} />
            </li>
          ))}
        </ul>

        <div className="border-t border-cream-300 pt-4">
          <RecentRecipes />
        </div>
      </nav>

      {/* Footer — user profile (pinned) */}
      <div className="shrink-0 border-t border-cream-300 px-4 py-4">
        <UserProfile />
      </div>
    </div>
  )
}
