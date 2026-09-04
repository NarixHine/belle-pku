import { defineConfig } from 'wxt'

export default defineConfig({
    manifest: {
        name: 'Belle PKU Timetable',
        description: 'Preview PKU elective course sections on your current timetable.',
        permissions: [],
        browser_specific_settings: {
            gecko: {
                id: 'belle-pku-timetable@narixhine',
                data_collection_permissions: {
                    required: ['none'],
                },
                // Firefox reads this from the installed build; changing it later
                // does not re-point existing installs. Keep stable.
                update_url: 'https://belle-pku-assets.time.florist/updates.json',
            },
        },
    },
})
