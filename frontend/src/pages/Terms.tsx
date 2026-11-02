import { Link } from "react-router-dom";
import { ArrowLeft, ScrollText } from "lucide-react";
import { Card } from "../components/ui";

/**
 * The service terms members agree to, including the quiz and prize rules. Kept
 * as ordinary page copy so the build-time translator covers every sentence in
 * all four languages like the rest of the interface.
 */
export function TermsPage() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
      <Link
        to="/quiz"
        className="inline-flex w-fit items-center gap-1.5 rounded-xl text-sm font-semibold text-muted transition hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Back to the quiz
      </Link>

      <Card className="rounded-3xl p-5 sm:p-6">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white shadow-md shadow-fuchsia-500/30">
            <ScrollText className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <h1 className="font-display text-xl font-black text-ink">Terms & conditions</h1>
            <p className="text-xs text-muted">Ethio Quest service terms, last updated 2 November 2026</p>
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-5 text-sm leading-relaxed text-muted">
          <section className="flex flex-col gap-1.5">
            <h2 className="font-display text-base font-bold text-ink">1. The service</h2>
            <p>
              Ethio Quest is a community app for Ethiopia: a daily knowledge quiz, a map of places worth visiting,
              travel stories and direct messages. By creating an account or using the app you agree to these terms.
              If you do not agree with them, please do not use the service.
            </p>
          </section>

          <section className="flex flex-col gap-1.5">
            <h2 className="font-display text-base font-bold text-ink">2. Your account</h2>
            <p>
              You need one account, registered with a working email address, to play and appear on the leaderboard.
              Keep your password private; anything done from your account is treated as done by you. You must be 18
              or older to claim a cash, item or travel prize. One account per person — accounts may not be sold,
              shared or run on someone else's behalf. We may suspend or close accounts that break these terms.
            </p>
          </section>

          <section className="flex flex-col gap-1.5">
            <h2 className="font-display text-base font-bold text-ink">3. Playing the quiz</h2>
            <p>
              Each day has ten questions. Every member gets one free play per day. Further attempts on the same day
              cost ETB 3 each, paid by Telebirr, CBE Birr or cash, and are not refundable once the attempt has
              started. Only completed attempts count towards the leaderboard, and a day, week or month is measured in
              Ethiopian time (UTC+3).
            </p>
          </section>

          <section className="flex flex-col gap-1.5">
            <h2 className="font-display text-base font-bold text-ink">4. How the ranking works</h2>
            <p>
              Members are ranked by the points earned from answered questions within the period. The board covers
              three periods — today, this week (Monday to Sunday) and this month. When points are equal, the member
              with the faster total answering time ranks higher, and an earlier finishing time breaks any remaining
              tie.
            </p>
          </section>

          <section className="flex flex-col gap-1.5">
            <h2 className="font-display text-base font-bold text-ink">5. Prize types and winners</h2>
            <p>
              The prize types and the number of winning places for each period are published in the Prize types tab
              of the leaderboard and are set by the Ethio Quest team. They may be changed; the table shown when a
              period closes is the one that applies to that period.
            </p>
            <ul className="flex list-disc flex-col gap-1 pl-4">
              <li>Winners are the members at the top of the final board for the period, up to the configured places.</li>
              <li>
                A prize must be claimed within 30 days of the period closing, from the account that won it, with a
                valid ID. A prize that is not claimed in time returns to the pool.
              </li>
              <li>
                A trip, item or trophy may be handed over as described, or as its cash value where it cannot be
                arranged.
              </li>
              <li>
                Taxes, bank charges and any travel costs beyond those described in the prize are the winner's
                responsibility.
              </li>
              <li>Prizes are personal and cannot be transferred or exchanged for a different prize.</li>
            </ul>
          </section>

          <section className="flex flex-col gap-1.5">
            <h2 className="font-display text-base font-bold text-ink">6. Fair play</h2>
            <p>
              Bots, scripts, automated answering, more than one account per person, playing on someone else's behalf,
              sharing answers during a live period, or interfering with the app will void the affected attempts and
              prizes and may close the account. Staff decisions on fair play and on the final ranking are final.
            </p>
          </section>

          <section className="flex flex-col gap-1.5">
            <h2 className="font-display text-base font-bold text-ink">7. Content you share</h2>
            <p>
              Stories, photos, comments and messages remain yours. By posting them you allow us to show them in the
              app. Do not post content that is illegal, hateful, misleading or that you do not have the right to
              share; we may remove it and, for repeated abuse, close the account.
            </p>
          </section>

          <section className="flex flex-col gap-1.5">
            <h2 className="font-display text-base font-bold text-ink">8. Your data</h2>
            <p>
              We keep the account details you provide, your quiz results and the prize records needed to run the
              leaderboard and hand over prizes. We do not sell your data. You can ask us to correct or delete your
              account details, except records we must keep for paid prizes.
            </p>
          </section>

          <section className="flex flex-col gap-1.5">
            <h2 className="font-display text-base font-bold text-ink">9. Changes and availability</h2>
            <p>
              We may update the quiz, the prizes and these terms. Material changes are announced in the app before
              they take effect, and continuing to use the service after that means you accept them. The app is
              provided as it is; we do not promise uninterrupted availability and are not liable for lost plays
              caused by outages, network problems or device faults.
            </p>
          </section>

          <section className="flex flex-col gap-1.5">
            <h2 className="font-display text-base font-bold text-ink">10. Questions</h2>
            <p>
              Questions about these terms, a prize or your data? Message the Ethio Quest team from the Messages tab
              in the app and we will reply.
            </p>
          </section>

          <p className="rounded-xl bg-raised/60 p-3 text-xs">
            These terms are published in English, Amharic, Afaan Oromoo and Tigrinya for convenience. If the
            translations differ, the English version applies.
          </p>
        </div>
      </Card>
    </div>
  );
}
