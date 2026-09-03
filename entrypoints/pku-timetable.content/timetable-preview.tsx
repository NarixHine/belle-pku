import { PreviewBlock } from './preview-block'
import type { PreviewModel } from './types'

const days = ['一', '二', '三', '四', '五']
const slots = Array.from({ length: 12 }, (_, index) => index + 1)

export function TimetablePreview({ model }: { model: PreviewModel }) {
    return (
        <section class='preview' aria-label={`${model.section.courseName}课表预览`}>
            <div class='schedule' role='img' aria-label={`${model.section.courseName}每周课表`}>
                <div class='schedule__corner'>节</div>
                {days.map((day, index) => (
                    <div class='schedule__day' key={day} style={{ gridColumn: index + 2 }}>
                        周{day}
                    </div>
                ))}
                {slots.map(slot => (
                    <div class='schedule__slot' key={slot} style={{ gridRow: slot + 1 }}>
                        {slot}
                    </div>
                ))}
                <div class='schedule__canvas' />
                {model.blocks.map(block => (
                    <PreviewBlock block={block} key={block.id} />
                ))}
            </div>
        </section>
    )
}
