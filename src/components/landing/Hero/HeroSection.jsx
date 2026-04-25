import { MobileHero } from './MobileHero';
import { DesktopHero } from './DesktopHero';

/**
 * HeroSection - Main hero section container that renders both mobile and desktop variants.
 * Uses responsive design to show the appropriate hero component based on screen size.
 *
 * @param {Object} props - Component props
 * @param {Function} props.onOpenJDModal - Callback function to open the JD parsing modal, passed to both mobile and desktop variants
 * @returns {JSX.Element} Rendered hero section with both mobile and desktop components
 */
export const HeroSection = ({ onOpenJDModal }) => {
    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <MobileHero 
                onOpenJDModal={onOpenJDModal}
            />
            <DesktopHero 
                onOpenJDModal={onOpenJDModal}
            />
        </div>
    );
};
