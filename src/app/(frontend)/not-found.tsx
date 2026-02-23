import { Button, Icon } from '@/components/ui'

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4">
      <div className="text-center">
        <div className="mb-8 inline-flex h-24 w-24 items-center justify-center rounded-full bg-navy-900/10">
          <Icon name="x" className="h-12 w-12 text-navy-900" strokeWidth={1.5} />
        </div>
        <h1 className="mb-4 text-6xl font-bold text-navy-900">404</h1>
        <h2 className="mb-4 text-2xl font-bold text-navy-900">Page Not Found</h2>
        <p className="mb-8 max-w-md text-gray-500">
          Sorry, the page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4">
          <Button variant="default" href="/">
            Go to Homepage
          </Button>
          <Button variant="outline" href="/contact">
            Contact Us
          </Button>
        </div>
      </div>
    </div>
  )
}
