import type { Action, InputController } from '../game/input';
import { UI_ASSETS } from '../rendering/assets';

const controls: Array<{ action: Action; label: string }> = [
    { action: 'turnLeft', label: 'Turn left' },
    { action: 'forward', label: 'Forward' },
    { action: 'turnRight', label: 'Turn right' },
    { action: 'fireLeft', label: 'Fire left' },
    { action: 'fireFront', label: 'Fire front' },
    { action: 'fireRight', label: 'Fire right' },
];

export function TouchControls({ input, disabled }: {
    input: InputController; disabled: boolean;
}) {
    return <div className="touch-controls">
        {[controls.slice(0, 3), controls.slice(3)].map((pad, index) =>
            <div className="control-pad" key={index}>
                {pad.map(({ action, label }) =>
                    <button key={action} className="game-round-button" data-action={action}
                        aria-label={label} title={label} disabled={disabled}
                        onPointerDown={(event) => {
                            event.currentTarget.setPointerCapture(event.pointerId);
                            input.set(action, 'pointer:' + event.pointerId, true);
                        }}
                        onPointerUp={(event) => input.set(action, 'pointer:' + event.pointerId, false)}
                        onPointerCancel={(event) => input.set(action, 'pointer:' + event.pointerId, false)}
                        onLostPointerCapture={(event) => input.set(action, 'pointer:' + event.pointerId, false)}
                        onKeyDown={(event) => {
                            if (event.code === 'Space' || event.code === 'Enter') {
                                event.preventDefault();
                                if (!event.repeat) input.set(action, 'button:' + event.code, true);
                            }
                        }}
                        onKeyUp={(event) => input.set(action, 'button:' + event.code, false)}
                        onBlur={() => {
                            input.set(action, 'button:Space', false);
                            input.set(action, 'button:Enter', false);
                        }}><img src={UI_ASSETS[action]} alt="" /></button>)}
            </div>)}
    </div>;
}