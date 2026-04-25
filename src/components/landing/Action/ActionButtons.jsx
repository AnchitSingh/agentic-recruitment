import { cn } from '../../../utils/designTokens';
import { ParseJDButton } from './ParseJDButton';

/**
 * AuthButtons - Container component for authentication-related action buttons.
 * Wraps the ParseJDButton with responsive layout styling.
 *
 * @param {Object} props - Component props
 * @param {boolean} [props.isMobile=false] - Whether to apply mobile-specific styling
 * @param {Function} props.onOpenJDModal - Callback function to open the JD parsing modal
 * @returns {JSX.Element} Rendered action buttons container
 */
export const AuthButtons = ({ isMobile = false, onOpenJDModal }) => {
    return (
        <div className={cn('space-y-3', isMobile ? 'w-full' : 'max-w-sm')}>

            <ParseJDButton isMobile={isMobile} onClick={onOpenJDModal} />
        </div>
    );
};