import { Link } from "@tanstack/react-router";
import { GraduationCap } from "lucide-react";

export function SiteFooter() {
  return (
    <footer className="mt-20 border-t bg-panel">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-lg bg-hero text-primary-foreground">
              <GraduationCap className="size-4" aria-hidden />
            </span>
            <span className="font-display font-bold">CampusConnect</span>
          </div>
          <p className="text-sm text-muted-foreground">
            The single place for every fest, workshop, tournament and seminar on campus.
          </p>
        </div>
        <div className="space-y-2 text-sm">
          <h4 className="font-semibold">Explore</h4>
          <Link to="/events" className="block text-muted-foreground hover:text-primary">
            All events
          </Link>
          <Link to="/dashboard" className="block text-muted-foreground hover:text-primary">
            Student dashboard
          </Link>
          <Link to="/registrations" className="block text-muted-foreground hover:text-primary">
            My registrations
          </Link>
        </div>
        <div className="space-y-2 text-sm">
          <h4 className="font-semibold">Student office</h4>
          <p className="text-muted-foreground">Student Activity Centre, Block A</p>
          <p className="text-muted-foreground">Mon–Fri, 9:00am – 5:00pm</p>
        </div>
        <div className="space-y-2 text-sm">
          <h4 className="font-semibold">Need help?</h4>
          <p className="text-muted-foreground">events@campusconnect.edu</p>
          <p className="text-muted-foreground">+91 80 4000 1200</p>
        </div>
      </div>
      <div className="border-t px-4 py-5 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} CampusConnect Student Activity Centre. All rights reserved.
      </div>
    </footer>
  );
}
