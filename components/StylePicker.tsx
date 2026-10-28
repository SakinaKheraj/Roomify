import { ROOM_STYLES } from "../lib/constants";

interface StylePickerProps {
    selectedStyle: RoomStyle | null;
    onSelect: (style: RoomStyle) => void;
    disabled: boolean;
}

const StylePicker = ({ selectedStyle, onSelect, disabled }: StylePickerProps) => {
    return (
        <div className={`style-picker-section${disabled ? " disabled" : ""}`}>
            <div className="style-picker-label">
                <span className="style-picker-label-icon">✨</span>
                <span>Room Vibe</span>
                {selectedStyle && (
                    <span className="style-picker-selected-tag">
                        {selectedStyle.emoji} {selectedStyle.label}
                    </span>
                )}
            </div>
            <div className="style-picker-row" role="radiogroup" aria-label="Select a room vibe">
                {ROOM_STYLES.map((style) => {
                    const isSelected = selectedStyle?.id === style.id;
                    return (
                        <button
                            key={style.id}
                            id={`style-card-${style.id}`}
                            role="radio"
                            aria-checked={isSelected}
                            aria-label={style.label}
                            disabled={disabled}
                            onClick={() => onSelect(style)}
                            className={`style-card${isSelected ? " selected" : ""}`}
                        >
                            <span className="style-card-emoji" aria-hidden="true">
                                {style.emoji}
                            </span>
                            <span className="style-card-label">{style.label}</span>
                            {isSelected && (
                                <span className="style-card-check" aria-hidden="true">✓</span>
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

export default StylePicker;
